'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  Smile,
  X,
  Image as ImageIcon,
  FileText,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Play,
  Pause,
  Download,
  Loader2
} from 'lucide-react';

// WhatsApp API Configuration
const WHATSAPP_API_URL = 'http://146.148.3.123:3001';
const WHATSAPP_API_KEY = 'tt_live_a8f3k2m9x7p4q1w6';

// Message Types
export interface WhatsAppMessage {
  id: string;
  phone: string;
  message?: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video';
  direction: 'incoming' | 'outgoing';
  timestamp: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  mediaUrl?: string;
  fileName?: string;
  mimeType?: string;
  caption?: string;
}

// Emoji Picker Data
const EMOJI_CATEGORIES = [
  {
    name: 'Häufig',
    emojis: ['😊', '👍', '❤️', '😂', '🙏', '😍', '🎉', '👋', '✅', '🔥', '💪', '😉']
  },
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑']
  },
  {
    name: 'Gesten',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👋', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏', '💪']
  },
  {
    name: 'Herzen',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝']
  },
  {
    name: 'Objekte',
    emojis: ['🏠', '🏨', '🛏️', '🛋️', '🚿', '🍽️', '☕', '🍷', '🎂', '🎁', '📧', '📞', '💳', '🔑', '📅', '⏰', '✈️', '🚗']
  }
];

interface WhatsAppChatProps {
  phone: string;
  customerName?: string;
  onClose?: () => void;
}

export function WhatsAppChat({ phone, customerName }: WhatsAppChatProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Format phone number
  const formatPhone = (p: string) => {
    // Remove all non-digits except leading +
    let cleaned = p.replace(/[^\d+]/g, '');
    // If starts with 0, assume Austrian number
    if (cleaned.startsWith('0')) {
      cleaned = '+43' + cleaned.substring(1);
    }
    // If no + prefix, add it
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  };

  const formattedPhone = formatPhone(phone);

  // Load messages
  const loadMessages = async () => {
    if (!phone) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${WHATSAPP_API_URL}/messages/${encodeURIComponent(formattedPhone)}`, {
        headers: { 'X-API-Key': WHATSAPP_API_KEY }
      });

      if (!response.ok) {
        throw new Error('Nachrichten konnten nicht geladen werden');
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error loading messages:', err);
      setError('Fehler beim Laden der Nachrichten');
    } finally {
      setLoading(false);
    }
  };

  // Send text message
  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage: WhatsAppMessage = {
      id: tempId,
      phone: formattedPhone,
      message: newMessage.trim(),
      type: 'text',
      direction: 'outgoing',
      timestamp: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    setSending(true);
    setShowEmojiPicker(false);

    try {
      const response = await fetch(`${WHATSAPP_API_URL}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WHATSAPP_API_KEY
        },
        body: JSON.stringify({
          phone: formattedPhone,
          message: tempMessage.message,
          type: 'text'
        })
      });

      if (!response.ok) {
        throw new Error('Nachricht konnte nicht gesendet werden');
      }

      const data = await response.json();

      // Update temp message with real data
      setMessages(prev => prev.map(m =>
        m.id === tempId
          ? { ...m, id: data.messageId || tempId, status: 'sent' as const }
          : m
      ));
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, status: 'failed' as const } : m
      ));
    } finally {
      setSending(false);
    }
  };

  // Send media
  const sendMedia = async (file: File) => {
    const tempId = `temp-${Date.now()}`;
    const isImage = file.type.startsWith('image/');
    const isAudio = file.type.startsWith('audio/');
    const isVideo = file.type.startsWith('video/');

    const type = isImage ? 'image' : isAudio ? 'audio' : isVideo ? 'video' : 'document';

    const tempMessage: WhatsAppMessage = {
      id: tempId,
      phone: formattedPhone,
      type,
      direction: 'outgoing',
      timestamp: new Date().toISOString(),
      status: 'sending',
      fileName: file.name,
      mimeType: file.type
    };

    setMessages(prev => [...prev, tempMessage]);
    setSending(true);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch(`${WHATSAPP_API_URL}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WHATSAPP_API_KEY
        },
        body: JSON.stringify({
          phone: formattedPhone,
          type,
          media: base64,
          fileName: file.name,
          mimeType: file.type
        })
      });

      if (!response.ok) {
        throw new Error('Datei konnte nicht gesendet werden');
      }

      const data = await response.json();

      setMessages(prev => prev.map(m =>
        m.id === tempId
          ? { ...m, id: data.messageId || tempId, status: 'sent' as const, mediaUrl: data.mediaUrl }
          : m
      ));
    } catch (err) {
      console.error('Error sending media:', err);
      setMessages(prev => prev.map(m =>
        m.id === tempId ? { ...m, status: 'failed' as const } : m
      ));
    } finally {
      setSending(false);
    }
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
        await sendMedia(audioFile);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Mikrofon konnte nicht aktiviert werden');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
      setIsRecording(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load messages on mount and phone change
  useEffect(() => {
    loadMessages();
  }, [phone]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Format timestamp
  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  // Status icon
  const StatusIcon = ({ status }: { status?: string }) => {
    switch (status) {
      case 'sending': return <Clock className="h-3 w-3 text-slate-400" />;
      case 'sent': return <Check className="h-3 w-3 text-slate-400" />;
      case 'delivered': return <CheckCheck className="h-3 w-3 text-slate-400" />;
      case 'read': return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'failed': return <AlertCircle className="h-3 w-3 text-red-500" />;
      default: return null;
    }
  };

  // Render message content
  const renderMessageContent = (msg: WhatsAppMessage) => {
    switch (msg.type) {
      case 'image':
        return (
          <div className="space-y-1">
            {msg.mediaUrl ? (
              <img
                src={msg.mediaUrl}
                alt="Bild"
                className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90"
                onClick={() => window.open(msg.mediaUrl, '_blank')}
              />
            ) : (
              <div className="w-[200px] h-[150px] bg-slate-200 rounded-lg flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-slate-400" />
              </div>
            )}
            {msg.caption && <p className="text-sm">{msg.caption}</p>}
          </div>
        );

      case 'document':
        return (
          <a
            href={msg.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white/20 rounded-lg hover:bg-white/30"
          >
            <FileText className="h-8 w-8" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{msg.fileName || 'Dokument'}</p>
              <p className="text-xs opacity-70">{msg.mimeType || 'Datei'}</p>
            </div>
            <Download className="h-5 w-5" />
          </a>
        );

      case 'audio':
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            <button
              onClick={() => setPlayingAudio(playingAudio === msg.id ? null : msg.id)}
              className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
            >
              {playingAudio === msg.id ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </button>
            <div className="flex-1">
              <div className="h-1 bg-white/30 rounded-full">
                <div className="h-1 bg-white/60 rounded-full w-1/3" />
              </div>
              <p className="text-xs opacity-70 mt-1">0:00 / 0:30</p>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="relative">
            {msg.mediaUrl ? (
              <video
                src={msg.mediaUrl}
                controls
                className="max-w-[200px] rounded-lg"
              />
            ) : (
              <div className="w-[200px] h-[150px] bg-slate-200 rounded-lg flex items-center justify-center">
                <Play className="h-8 w-8 text-slate-400" />
              </div>
            )}
          </div>
        );

      default:
        return <p className="text-sm whitespace-pre-wrap">{msg.message}</p>;
    }
  };

  if (!phone) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>Keine Telefonnummer verfügbar</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#e5ddd5]">
      {/* Chat Header */}
      <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-lg font-medium">
            {customerName?.charAt(0).toUpperCase() || '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{customerName || 'Unbekannt'}</p>
          <p className="text-xs text-white/70">{formattedPhone}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 text-[#075e54] animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <AlertCircle className="h-12 w-12 mb-4" />
            <p>{error}</p>
            <button
              onClick={loadMessages}
              className="mt-4 px-4 py-2 bg-[#075e54] text-white rounded-lg hover:bg-[#064e46]"
            >
              Erneut versuchen
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <div className="h-16 w-16 rounded-full bg-[#075e54]/10 flex items-center justify-center mb-4">
              <Send className="h-8 w-8 text-[#075e54]" />
            </div>
            <p className="font-medium">Keine Nachrichten</p>
            <p className="text-sm text-center mt-1">Senden Sie die erste Nachricht an diesen Kontakt</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[75%] rounded-lg px-3 py-2 shadow-sm
                  ${msg.direction === 'outgoing'
                    ? 'bg-[#dcf8c6] text-slate-900'
                    : 'bg-white text-slate-900'
                  }
                `}
              >
                {renderMessageContent(msg)}
                <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[10px] text-slate-500">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                  {msg.direction === 'outgoing' && <StatusIcon status={msg.status} />}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="bg-white border-t border-slate-200 p-3 max-h-[200px] overflow-auto">
          {EMOJI_CATEGORIES.map((category) => (
            <div key={category.name} className="mb-3">
              <p className="text-xs text-slate-500 mb-2">{category.name}</p>
              <div className="flex flex-wrap gap-1">
                {category.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setNewMessage(prev => prev + emoji);
                    }}
                    className="text-xl p-1 hover:bg-slate-100 rounded"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="bg-[#f0f0f0] px-3 py-2">
        {isRecording ? (
          // Recording UI
          <div className="flex items-center gap-3 bg-white rounded-full px-4 py-2">
            <button
              onClick={cancelRecording}
              className="p-2 text-red-500 hover:bg-red-50 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex-1 flex items-center gap-3">
              <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-mono text-slate-600">{formatTime(recordingTime)}</span>
              <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 transition-all duration-1000"
                  style={{ width: `${Math.min(recordingTime * 1.67, 100)}%` }}
                />
              </div>
            </div>
            <button
              onClick={stopRecording}
              className="p-2 bg-[#075e54] text-white rounded-full hover:bg-[#064e46]"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        ) : (
          // Normal input UI
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'bg-slate-300 text-slate-700' : 'text-slate-500 hover:bg-slate-200'}`}
            >
              <Smile className="h-6 w-6" />
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-500 hover:bg-slate-200 rounded-full"
            >
              <Paperclip className="h-6 w-6" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) sendMedia(file);
                e.target.value = '';
              }}
              className="hidden"
            />

            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Nachricht schreiben..."
                className="w-full px-4 py-2 bg-white rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-[#075e54]"
              />
            </div>

            {newMessage.trim() ? (
              <button
                onClick={sendMessage}
                disabled={sending}
                className="p-2 bg-[#075e54] text-white rounded-full hover:bg-[#064e46] disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Send className="h-6 w-6" />
                )}
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="p-2 bg-[#075e54] text-white rounded-full hover:bg-[#064e46]"
              >
                <Mic className="h-6 w-6" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default WhatsAppChat;
