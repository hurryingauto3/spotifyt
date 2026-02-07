import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { MatchResult } from '@/lib/matching/types';
import { addToLiked, addToPlaylist, createPlaylist as createSpotifyPlaylist } from '@/lib/spotify/client';
import { addVideosToPlaylist, createPlaylist as createYouTubePlaylist } from '@/lib/youtube/client';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json();

    const {
      matchResults,
      direction,
      targetPlaylistId,
      targetPlaylistName,
      createNew,
    }: {
      matchResults: MatchResult[];
      direction: 'spotify_to_youtube' | 'youtube_to_spotify';
      targetPlaylistId?: string;
      targetPlaylistName?: string;
      createNew: boolean;
    } = body;

    if (!matchResults || !direction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate authentication
    if (direction === 'spotify_to_youtube' && !session.youtube) {
      return NextResponse.json({ error: 'YouTube not connected' }, { status: 401 });
    }
    if (direction === 'youtube_to_spotify' && !session.spotify) {
      return NextResponse.json({ error: 'Spotify not connected' }, { status: 401 });
    }

    // Filter to confirmed tracks (matched or user-confirmed low confidence)
    const confirmedMatches = matchResults.filter(
      (r) => r.target && (r.status === 'matched' || r.status === 'low_confidence')
    );

    if (confirmedMatches.length === 0) {
      return NextResponse.json({ error: 'No tracks to sync' }, { status: 400 });
    }

    let playlistId = targetPlaylistId;
    let playlistUrl = '';

    // Create new playlist if requested
    if (createNew && targetPlaylistName) {
      if (direction === 'youtube_to_spotify') {
        const playlist = await createSpotifyPlaylist(
          session,
          targetPlaylistName,
          `Synced from YouTube Music on ${new Date().toLocaleDateString()}`
        );
        playlistId = playlist.id;
        playlistUrl = playlist.url;
      } else {
        const playlist = await createYouTubePlaylist(
          session,
          targetPlaylistName,
          `Synced from Spotify on ${new Date().toLocaleDateString()}`
        );
        playlistId = playlist.id;
        playlistUrl = playlist.url;
      }
    }

    let added = 0;
    let failed = 0;

    // Execute sync
    if (direction === 'youtube_to_spotify') {
      const trackUris = confirmedMatches.map((r) => r.target!.id);

      try {
        if (playlistId === 'liked' || !playlistId) {
          await addToLiked(session, trackUris);
        } else {
          await addToPlaylist(session, playlistId, trackUris);
        }
        added = trackUris.length;
      } catch (error) {
        console.error('Failed to add to Spotify:', error);
        failed = trackUris.length;
      }
    } else {
      // Spotify to YouTube
      const videoIds = confirmedMatches.map((r) => r.target!.videoId || r.target!.id);

      if (!playlistId) {
        return NextResponse.json({ error: 'Target playlist required for YouTube sync' }, { status: 400 });
      }

      try {
        await addVideosToPlaylist(session, playlistId, videoIds);
        added = videoIds.length;
      } catch (error) {
        console.error('Failed to add to YouTube:', error);
        failed = videoIds.length;
      }
    }

    // Save sync history
    const syncHistory = await prisma.syncHistory.create({
      data: {
        direction,
        sourcePlaylistId: matchResults[0]?.source.id || 'unknown',
        sourcePlaylistName: 'Source Playlist',
        targetPlaylistId: playlistId || null,
        targetPlaylistName: targetPlaylistName || null,
        totalTracks: matchResults.length,
        matched: matchResults.filter((r) => r.status === 'matched').length,
        notFound: matchResults.filter((r) => r.status === 'not_found').length,
        alreadyExisted: matchResults.filter((r) => r.status === 'already_exists').length,
        lowConfidence: matchResults.filter((r) => r.status === 'low_confidence').length,
      },
    });

    // Save match records
    for (const result of confirmedMatches) {
      await prisma.matchRecord.create({
        data: {
          syncHistoryId: syncHistory.id,
          sourceTrackId: result.source.id,
          sourceTitle: result.source.title,
          sourceArtist: result.source.artist,
          targetTrackId: result.target?.id,
          targetTitle: result.target?.title,
          targetArtist: result.target?.artist,
          confidence: result.confidence,
          status: result.status,
        },
      });
    }

    return NextResponse.json({
      success: true,
      added,
      failed,
      playlistUrl: playlistUrl || (playlistId ? `https://open.spotify.com/playlist/${playlistId}` : ''),
      syncHistoryId: syncHistory.id,
    });
  } catch (error: any) {
    console.error('Execute sync error:', error);
    return NextResponse.json({ error: error.message || 'Failed to execute sync' }, { status: 500 });
  }
}
