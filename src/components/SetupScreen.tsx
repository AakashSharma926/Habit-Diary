import React, { useState } from 'react';
import { Database, ExternalLink, Copy, CheckCircle, AlertTriangle } from 'lucide-react';

interface SetupScreenProps {
  onSkip?: () => void;
}

export function SetupScreen({ onSkip }: SetupScreenProps) {
  const [copied, setCopied] = useState(false);

  const envTemplate = `VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id`;

  const firestoreRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center p-4">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl w-full">
        <div className="glass rounded-2xl p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
              <Database className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold gradient-text mb-2">Firebase Setup Required</h1>
            <p className="text-slate-400">
              Connect your Firebase project to start tracking habits across devices
            </p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-6">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-400 mb-1">Firebase is not configured</p>
              <p className="text-slate-300">
                Create a Firebase project and add your credentials to enable data persistence and sync.
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-4 mb-6">
            <h2 className="font-semibold text-lg">Quick Setup Guide</h2>
            
            <div className="space-y-3">
              <Step number={1} title="Create Firebase Project">
                <p className="text-sm text-slate-400 mb-2">
                  Go to Firebase Console and create a new project (or use existing)
                </p>
                <a
                  href="https://console.firebase.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  Open Firebase Console <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </Step>

              <Step number={2} title="Add Web App">
                <p className="text-sm text-slate-400">
                  In Project Settings → General → Your apps → Add app → Web
                </p>
              </Step>

              <Step number={3} title="Create Firestore Database">
                <p className="text-sm text-slate-400 mb-2">
                  Go to Firestore Database → Create database → Start in test mode
                </p>
                <div className="bg-slate-800/50 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                  <pre className="text-slate-300">{firestoreRules}</pre>
                </div>
              </Step>

              <Step number={4} title="Create .env file">
                <p className="text-sm text-slate-400 mb-2">
                  Create a <code className="text-violet-400">.env</code> file in the project root with your Firebase config:
                </p>
                <div className="bg-slate-800/50 rounded-lg p-3 font-mono text-xs overflow-x-auto relative">
                  <pre className="text-slate-300">{envTemplate}</pre>
                  <button
                    onClick={() => copyToClipboard(envTemplate)}
                    className="absolute top-2 right-2 p-1.5 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </Step>

              <Step number={5} title="Restart Dev Server">
                <p className="text-sm text-slate-400">
                  After adding the <code className="text-violet-400">.env</code> file, restart the development server
                </p>
              </Step>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 rounded-xl font-medium transition-all text-center"
            >
              <ExternalLink className="w-4 h-4" />
              Open Firebase Console
            </a>
            {onSkip && (
              <button
                onClick={onSkip}
                className="flex-1 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
              >
                Continue Without Firebase
              </button>
            )}
          </div>

          <p className="text-center text-xs text-slate-500 mt-4">
            The app will use localStorage as fallback if Firebase is not configured
          </p>
        </div>
      </div>
    </div>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center shrink-0 text-sm font-bold">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="font-medium mb-1">{title}</h3>
        {children}
      </div>
    </div>
  );
}



