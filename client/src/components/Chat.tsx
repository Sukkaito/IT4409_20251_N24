import { useState, useEffect, useRef } from 'react';

interface ChatMessage {
  type: 'player' | 'system';
  content: string;
}

interface ChatProps {
  chatMessages: ChatMessage[];
  onSendMessage: (message: string) => void;
}

export function Chat({ chatMessages, onSendMessage }: ChatProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Handle Enter key to focus chat input or blur if already focused with no text
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (e.target as HTMLElement)?.tagName?.toLowerCase() || '';
      const isTyping = activeTag === 'input' || activeTag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;
      
      // If Enter is pressed and not typing
      if (e.key === 'Enter' && !isTyping) {
        // If chat input is already focused and has no text, blur it
        if (document.activeElement === inputRef.current && !inputValue.trim()) {
          inputRef.current?.blur();
        } else {
          // Otherwise, focus chat input
          setTimeout(() => {
            inputRef.current?.focus();
          }, 10);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputValue]);

  const handleSend = () => {
    const message = inputValue.trim();
    if (message) {
      onSendMessage(message);
      setInputValue('');
      inputRef.current?.blur();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (inputValue.trim()) {
        handleSend();
      } else {
        // If no text, blur input to avoid interfering with game controls
        inputRef.current?.blur();
      }
    }
  };

  return (
    <>
      <div style={{
        position: 'absolute',
        left: '139px',
        top: '760px',
        width: '1168px',
        height: '254px',
        zIndex: 1000,
        pointerEvents: 'none'
      }}>
        <img
          src="/elements/LobbyUI/chatbox@4x.png"
          alt="Chatbox"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block'
          }}
        />
      </div>

      <div id="chat" style={{
        position: 'absolute',
        left: '139px',
        top: '760px',
        width: '1168px',
        height: '254px',
        zIndex: 1001,
        pointerEvents: 'none',
        background: 'transparent',
        border: 'none',
        borderRadius: '0',
        boxShadow: 'none'
      } as React.CSSProperties}>
        <div id="chatMessages" style={{
          height: '100%',
          overflowY: 'auto',
          padding: '20px',
          pointerEvents: 'auto',
          background: 'transparent'
        }}>
          {chatMessages.map((msg, index) => (
            <div
              key={index}
              className={`chat-message ${msg.type}`}
              style={{
                margin: '5px 0',
                fontSize: '14px',
                color: msg.type === 'system' ? '#4ECDC4' : '#FFEAA7',
                fontStyle: msg.type === 'system' ? 'italic' : 'normal'
              }}
            >
              {msg.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div style={{
        position: 'absolute',
        left: '176px',
        top: '922px',
        width: '966px',
        height: '65px',
        zIndex: 1000,
        pointerEvents: 'none'
      }}>
        <img
          src="/elements/LobbyUI/inputField@4x.png"
          alt="Input Field"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block'
          }}
        />
      </div>

      <input
        ref={inputRef}
        type="text"
        id="chatInput"
        placeholder="Type a message... (Press Enter to send)"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        style={{
          position: 'absolute',
          left: '176px',
          top: '922px',
          width: '966px',
          height: '65px',
          padding: '0 20px',
          background: 'transparent',
          border: 'none',
          color: 'white',
          fontSize: '16px',
          zIndex: 1001,
          outline: 'none'
        }}
      />

      <div
        onClick={handleSend}
        style={{
          position: 'absolute',
          left: '1197px',
          top: '922px',
          width: '63px',
          height: '63px',
          cursor: 'pointer',
          pointerEvents: 'auto',
          zIndex: 1001
        }}
      >
        <img
          src="/elements/LobbyUI/sentButton@4x.png"
          alt="Send Button"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block'
          }}
        />
      </div>
    </>
  );
}

