import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - SpotifYT',
  description: 'Privacy Policy for SpotifYT - Learn how we protect your data when syncing music between Spotify and YouTube Music.',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8 shadow-2xl">
        <h1 className="text-4xl font-bold text-white mb-6">Privacy Policy</h1>
        <p className="text-purple-200 mb-4">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="space-y-6 text-purple-100">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">1. Introduction</h2>
            <p>
              SpotifyT ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect,
              use, and safeguard your information when you use our music synchronization service between Spotify and YouTube Music.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">2. Information We Collect</h2>
            <h3 className="text-xl font-medium text-purple-200 mb-2">2.1 Authentication Data</h3>
            <p className="mb-3">
              When you connect your Spotify and YouTube accounts, we collect:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>OAuth tokens for Spotify and YouTube Music</li>
              <li>User profile information (username, email)</li>
              <li>Account identifiers</li>
            </ul>

            <h3 className="text-xl font-medium text-purple-200 mb-2 mt-4">2.2 Music Library Data</h3>
            <p className="mb-3">
              To provide synchronization services, we access:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Your playlists from Spotify and YouTube Music</li>
              <li>Track information (title, artist, duration)</li>
              <li>Playlist metadata</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use your information to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Match and synchronize tracks between Spotify and YouTube Music</li>
              <li>Create and update playlists on your behalf</li>
              <li>Improve our matching algorithms using Google Gemini AI</li>
              <li>Provide customer support</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">4. Data Storage and Security</h2>
            <p className="mb-3">
              <strong>Session Storage:</strong> Authentication tokens are stored in encrypted session cookies and are never permanently stored on our servers.
            </p>
            <p className="mb-3">
              <strong>Security Measures:</strong> We implement industry-standard security measures including:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Encrypted HTTPS connections</li>
              <li>Secure session management with iron-session</li>
              <li>OAuth 2.0 authentication</li>
              <li>No storage of user credentials</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">5. Third-Party Services</h2>
            <p className="mb-3">We integrate with the following third-party services:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Spotify:</strong> To access your Spotify playlists and library</li>
              <li><strong>YouTube Music:</strong> To access your YouTube Music playlists</li>
              <li><strong>Google Gemini AI:</strong> To improve track matching accuracy</li>
            </ul>
            <p className="mt-3">
              Each service has its own privacy policy. We recommend reviewing their policies:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
              <li>Spotify Privacy Policy: <a href="https://www.spotify.com/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-200 underline">spotify.com/privacy</a></li>
              <li>Google Privacy Policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-200 underline">policies.google.com/privacy</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">6. Data Retention</h2>
            <p>
              We do not permanently store your playlist data or OAuth tokens. Session data is automatically cleared when you log out
              or your session expires. Cached match results may be stored temporarily to improve performance but contain no personally
              identifiable information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">7. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Disconnect your Spotify and YouTube accounts at any time</li>
              <li>Revoke application permissions through Spotify and Google account settings</li>
              <li>Request deletion of any cached data</li>
              <li>Access information about how your data is processed</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">8. Children's Privacy</h2>
            <p>
              Our service is not intended for users under 13 years of age. We do not knowingly collect information from children
              under 13. If you believe we have inadvertently collected such information, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy
              on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">10. Contact Us</h2>
            <p className="mb-3">
              If you have questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <ul className="list-none space-y-1 ml-4">
              <li>Email: privacy@spotifyt.app</li>
              <li>GitHub: <a href="https://github.com/anthropics/spotifyt/issues" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-200 underline">github.com/anthropics/spotifyt</a></li>
            </ul>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 font-medium"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
