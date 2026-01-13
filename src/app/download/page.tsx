'use client';

import { useState } from 'react';
import {
  Download,
  Monitor,
  CheckCircle,
  Terminal,
  FileCode,
  Settings,
  Cloud,
  HardDrive,
  ArrowRight
} from 'lucide-react';

export default function DownloadPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = (file: string) => {
    setDownloading(file);
    // Trigger download
    const link = document.createElement('a');
    link.href = `/downloads/${file}`;
    link.download = file;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setDownloading(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl mb-6">
            <Monitor className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            CapCorn Bridge
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Verbindet Ihre lokale CapHotel-Datenbank mit der Stadler Suite Web-App
          </p>
          <div className="mt-4 inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            Version 4.0 - Mit Backup-Agent
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <Cloud className="w-8 h-8 text-blue-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Cloud-Sync</h3>
            <p className="text-gray-600 text-sm">
              Automatische Synchronisation aller Daten zu Firebase
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <HardDrive className="w-8 h-8 text-green-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">Auto-Backup</h3>
            <p className="text-gray-600 text-sm">
              Automatische Datenbank-Sicherung mit intelligenter Aufbewahrung
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <Terminal className="w-8 h-8 text-purple-600 mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">REST API</h3>
            <p className="text-gray-600 text-sm">
              Vollstaendige API fuer Gaeste, Buchungen, Rechnungen und mehr
            </p>
          </div>
        </div>

        {/* Download Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Download</h2>

          {/* Main Download */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold mb-2">Automatische Installation</h3>
                <p className="text-blue-100 mb-4">
                  Installer herunterladen und ausfuehren - fertig!
                </p>
                <div className="flex items-center gap-2 text-sm text-blue-200">
                  <CheckCircle className="w-4 h-4" />
                  <span>Python-Pakete werden automatisch installiert</span>
                </div>
              </div>
              <button
                onClick={() => handleDownload('install.bat')}
                disabled={downloading === 'install.bat'}
                className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {downloading === 'install.bat' ? (
                  <>Wird heruntergeladen...</>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    install.bat
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Individual Files */}
          <h3 className="font-semibold text-gray-700 mb-4">Einzelne Dateien</h3>
          <div className="space-y-3">
            <button
              onClick={() => handleDownload('capcorn_bridge_gui.py')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileCode className="w-5 h-5 text-gray-500" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">capcorn_bridge_gui.py</div>
                  <div className="text-sm text-gray-500">GUI mit System-Tray und Backup</div>
                </div>
              </div>
              <Download className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => handleDownload('capcorn_bridge.py')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileCode className="w-5 h-5 text-gray-500" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">capcorn_bridge.py</div>
                  <div className="text-sm text-gray-500">REST API (Standalone)</div>
                </div>
              </div>
              <Download className="w-5 h-5 text-gray-400" />
            </button>

            <button
              onClick={() => handleDownload('README.txt')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileCode className="w-5 h-5 text-gray-500" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">README.txt</div>
                  <div className="text-sm text-gray-500">Installationsanleitung</div>
                </div>
              </div>
              <Download className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Installation Steps */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Installation</h2>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Python installieren</h3>
                <p className="text-gray-600 mt-1">
                  <a href="https://www.python.org/downloads/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    python.org/downloads
                  </a>
                  {' '}- Wichtig: &quot;Add Python to PATH&quot; aktivieren!
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">install.bat ausfuehren</h3>
                <p className="text-gray-600 mt-1">
                  Doppelklick auf die heruntergeladene Datei. Alles wird automatisch eingerichtet.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Google Cloud CLI (fuer Firebase-Sync)</h3>
                <p className="text-gray-600 mt-1">
                  <a href="https://cloud.google.com/sdk/docs/install" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    cloud.google.com/sdk
                  </a>
                  {' '}- Dann einmalig: <code className="bg-gray-100 px-2 py-1 rounded text-sm">gcloud auth application-default login</code>
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Fertig!</h3>
                <p className="text-gray-600 mt-1">
                  Desktop-Verknuepfung &quot;CapCorn Bridge&quot; starten und Datenbank-Pfad einstellen.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>CapCorn Bridge v4.0 - Hotel Stadler am Attersee</p>
          <p className="mt-1">
            <a href="/" className="text-blue-600 hover:underline">Zurueck zur App</a>
          </p>
        </div>
      </div>
    </div>
  );
}
