import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - SpotifYT',
  description: 'Terms of Service for SpotifYT - Review the terms and conditions for using our music synchronization service.',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-8 shadow-2xl">
        <h1 className="text-4xl font-bold text-white mb-6">Terms of Service</h1>
        <p className="text-purple-200 mb-4">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="space-y-6 text-purple-100">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using SpotifyT ("the Service"), you agree to be bound by these Terms of Service ("Terms").
              If you do not agree to these Terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">2. Description of Service</h2>
            <p className="mb-3">
              SpotifyT is a music synchronization tool that allows users to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Match and synchronize playlists between Spotify and YouTube Music</li>
              <li>Transfer music libraries across platforms</li>
              <li>Manage playlists using AI-powered track matching</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">3. Account Requirements</h2>
            <p className="mb-3">To use the Service, you must:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Have active Spotify and/or YouTube Music accounts</li>
              <li>Be at least 13 years of age (or the minimum age in your jurisdiction)</li>
              <li>Provide accurate authentication credentials</li>
              <li>Comply with Spotify and YouTube's respective Terms of Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">4. Acceptable Use</h2>
            <h3 className="text-xl font-medium text-purple-200 mb-2">4.1 Permitted Use</h3>
            <p className="mb-3">You may use the Service to:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Synchronize your personal playlists</li>
              <li>Manage your own music library</li>
              <li>Create backups of your playlists</li>
            </ul>

            <h3 className="text-xl font-medium text-purple-200 mb-2 mt-4">4.2 Prohibited Use</h3>
            <p className="mb-3">You may NOT:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Use the Service for commercial purposes without authorization</li>
              <li>Attempt to circumvent any limitations or security measures</li>
              <li>Abuse or overload the Service with excessive requests</li>
              <li>Share or distribute your authentication credentials</li>
              <li>Use the Service to infringe on copyrights or other intellectual property rights</li>
              <li>Reverse engineer, decompile, or disassemble the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">5. Third-Party Services</h2>
            <p className="mb-3">
              The Service integrates with Spotify and YouTube Music. By using our Service, you acknowledge that:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>You must comply with Spotify's Terms of Service and YouTube's Terms of Service</li>
              <li>We are not responsible for changes to third-party APIs or services</li>
              <li>Service availability may be affected by third-party downtime</li>
              <li>You grant us permission to access your playlists and music data on your behalf</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">6. Intellectual Property</h2>
            <p className="mb-3">
              <strong>Your Content:</strong> You retain all rights to your playlists and music preferences. By using the Service,
              you grant us a limited license to access and process this data solely for providing synchronization services.
            </p>
            <p>
              <strong>Our Service:</strong> The Service, including its code, design, and features, is protected by copyright and
              other intellectual property laws. You may not copy, modify, or distribute any part of the Service without permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">7. AI-Powered Matching</h2>
            <p>
              Our Service uses Google Gemini AI to improve track matching accuracy. While we strive for high accuracy, AI-generated
              matches may not always be perfect. You should review matched tracks before syncing to ensure accuracy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">8. Disclaimer of Warranties</h2>
            <p className="mb-3">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Accuracy of track matching</li>
              <li>Availability or uptime of the Service</li>
              <li>Compatibility with all playlists or music formats</li>
              <li>Freedom from errors, bugs, or security vulnerabilities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">9. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
              OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR PLAYLISTS, ARISING OUT OF YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">10. Service Modifications and Termination</h2>
            <p className="mb-3">
              We reserve the right to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Modify, suspend, or discontinue the Service at any time</li>
              <li>Change these Terms with notice to users</li>
              <li>Terminate your access for violations of these Terms</li>
              <li>Impose usage limits or restrictions as needed</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">11. Privacy</h2>
            <p>
              Your use of the Service is also governed by our Privacy Policy, available at{' '}
              <a href="/privacy" className="text-purple-300 hover:text-purple-200 underline">
                spotifyt-ckvj.vercel.app/privacy
              </a>.
              Please review it to understand how we collect and use your information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the United States,
              without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">13. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify users of material changes by posting the updated
              Terms on this page and updating the "Last updated" date. Your continued use of the Service after changes
              constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">14. Contact Information</h2>
            <p className="mb-3">
              If you have questions about these Terms, please contact us:
            </p>
            <ul className="list-none space-y-1 ml-4">
              <li>Email: legal@spotifyt.app</li>
              <li>GitHub: <a href="https://github.com/anthropics/spotifyt/issues" target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:text-purple-200 underline">github.com/anthropics/spotifyt</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">15. Severability</h2>
            <p>
              If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or
              eliminated to the minimum extent necessary, and the remaining provisions will remain in full force and effect.
            </p>
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
