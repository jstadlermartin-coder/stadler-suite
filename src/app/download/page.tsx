'use client';

import { useState } from 'react';
import {
  Download,
  Monitor,
  CheckCircle,
  Terminal,
  FileCode,
  Cloud,
  HardDrive,
  Package,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function DownloadPage() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showDevFiles, setShowDevFiles] = useState(false);

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

          {/* Main Download - EXE */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-6 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-6 h-6" />
                  <h3 className="text-xl font-semibold">CapCornBridge.exe</h3>
                </div>
                <p className="text-blue-100 mb-3">
                  Einfach herunterladen, in den CapCorn-Ordner kopieren, fertig!
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <div className="flex items-center gap-1 text-blue-200">
                    <CheckCircle className="w-4 h-4" />
                    <span>Kein Python noetig</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-200">
                    <CheckCircle className="w-4 h-4" />
                    <span>Eine Datei</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-200">
                    <CheckCircle className="w-4 h-4" />
                    <span>~33 MB</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDownload('CapCornBridge.exe')}
                disabled={downloading === 'CapCornBridge.exe'}
                className="flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {downloading === 'CapCornBridge.exe' ? (
                  <>Wird heruntergeladen...</>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download .exe
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Developer Files - Collapsible */}
          <button
            onClick={() => setShowDevFiles(!showDevFiles)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <FileCode className="w-5 h-5 text-gray-500" />
              <div>
                <div className="font-medium text-gray-900">Entwickler-Dateien</div>
                <div className="text-sm text-gray-500">Python-Quellcode und Installer-Script</div>
              </div>
            </div>
            {showDevFiles ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showDevFiles && (
            <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-200">
              <button
                onClick={() => handleDownload('install.bat')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileCode className="w-4 h-4 text-gray-500" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 text-sm">install.bat</div>
                    <div className="text-xs text-gray-500">Installer fuer Python-Version</div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => handleDownload('capcorn_bridge_gui.py')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileCode className="w-4 h-4 text-gray-500" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 text-sm">capcorn_bridge_gui.py</div>
                    <div className="text-xs text-gray-500">GUI mit System-Tray und Backup</div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => handleDownload('capcorn_bridge.py')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileCode className="w-4 h-4 text-gray-500" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 text-sm">capcorn_bridge.py</div>
                    <div className="text-xs text-gray-500">REST API (Standalone)</div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => handleDownload('README.txt')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileCode className="w-4 h-4 text-gray-500" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 text-sm">README.txt</div>
                    <div className="text-xs text-gray-500">Installationsanleitung</div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}
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
                <h3 className="font-semibold text-gray-900">CapCornBridge.exe herunterladen</h3>
                <p className="text-gray-600 mt-1">
                  Klicken Sie auf den Download-Button oben.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">In den CapCorn-Ordner kopieren</h3>
                <p className="text-gray-600 mt-1">
                  Kopieren Sie die .exe in den Ordner mit der caphotel.mdb Datenbank, z.B. <code className="bg-gray-100 px-2 py-1 rounded text-sm">C:\datat\</code>
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
                  {' '}- Einmalig installieren und authentifizieren:
                </p>
                <code className="block bg-gray-900 text-green-400 px-3 py-2 rounded mt-2 text-sm">
                  gcloud auth application-default login
                </code>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Fertig!</h3>
                <p className="text-gray-600 mt-1">
                  Doppelklick auf CapCornBridge.exe und Datenbank-Pfad einstellen.
                </p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h4 className="font-semibold text-blue-900 mb-2">Ordnerstruktur nach Installation</h4>
            <pre className="text-sm text-blue-800 font-mono">
{`C:\\datat\\
├── caphotel.mdb          # CapCorn Datenbank
├── CapCornBridge.exe     # Bridge (DIESE Datei)
├── config.json           # Wird automatisch erstellt
└── backups\\              # Backup-Ordner`}
            </pre>
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
