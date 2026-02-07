import YTMusic from 'ytmusic-api';

let ytmusicInstance: YTMusic | null = null;

async function getYTMusicClient(): Promise<YTMusic> {
  if (!ytmusicInstance) {
    ytmusicInstance = new YTMusic();
    await ytmusicInstance.initialize();
  }
  return ytmusicInstance;
}

export async function searchYTMusicSong(query: string) {
  const ytmusic = await getYTMusicClient();
  const results = await ytmusic.searchSongs(query);

  return results.slice(0, 5).map((song: any) => ({
    id: `youtube:video:${song.videoId}`,
    platform: 'youtube' as const,
    title: song.name,
    artist: song.artist?.name || 'Unknown',
    artists: song.artists?.map((a: any) => a.name) || [],
    album: song.album?.name,
    durationMs: song.duration ? song.duration * 1000 : 0,
    videoId: song.videoId,
    raw: song,
  }));
}

export async function getYTMusicPlaylist(playlistId: string) {
  const ytmusic = await getYTMusicClient();
  return ytmusic.getPlaylist(playlistId);
}

export async function getYTMusicPlaylistVideos(playlistId: string) {
  const ytmusic = await getYTMusicClient();
  const videos = await ytmusic.getPlaylistVideos(playlistId);

  return videos.map((video: any) => ({
    id: `youtube:video:${video.videoId}`,
    platform: 'youtube' as const,
    title: video.name,
    artist: video.artist?.name || 'Unknown',
    artists: video.artists?.map((a: any) => a.name) || [],
    album: video.album?.name,
    durationMs: video.duration ? video.duration * 1000 : 0,
    videoId: video.videoId,
    raw: video,
  }));
}
