import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const TypedMarkdown = ({ content, isStreaming = false, animate = false, speed = 20 }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [targetContent, setTargetContent] = useState(content);
  const [isTyping, setIsTyping] = useState(animate || isStreaming);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Synchronize target and reset for fresh messages
  useEffect(() => {
    if (!animate && !isStreaming) {
      // Historical or static message
      setDisplayedText(content);
      setTargetContent(content);
      setCurrentIndex(content.length);
      setIsTyping(false);
    } else {
      // Live stream or new cache hit
      setTargetContent(content);
      setIsTyping(true);
      
      // If content was cleared or is starting fresh
      if (content === "" || (currentIndex > content.length && content !== "")) {
        setDisplayedText("");
        setCurrentIndex(0);
      }
    }
  }, [content, animate, isStreaming]);

  // Master Typewriter Loop
  useEffect(() => {
    if (!isTyping) return;

    if (currentIndex < targetContent.length) {
      // DYNAMIC SPEED: If we are lagging far behind the stream buffer, type faster
      const gap = targetContent.length - currentIndex;
      const currentSpeed = gap > 200 ? 1 : gap > 50 ? 5 : speed;

      const timeout = setTimeout(() => {
        setDisplayedText(targetContent.substring(0, currentIndex + 1));
        setCurrentIndex(prev => prev + 1);
      }, currentSpeed);
      
      return () => clearTimeout(timeout);
    } else if (!isStreaming) {
      // We caught up and the stream is over
      setIsTyping(false);
    }
  }, [currentIndex, targetContent, isStreaming, isTyping, speed]);

  return (
    <div className="typed-markdown-container">
      <ReactMarkdown>{displayedText}</ReactMarkdown>
    </div>
  );
};

export default TypedMarkdown;
