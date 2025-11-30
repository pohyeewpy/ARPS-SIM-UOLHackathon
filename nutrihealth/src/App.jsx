// src/App.jsx
import React, { useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/api/chat"; // Backend entrypoint

export default function App() {
  // Track the visible conversation list.
  const [messages, setMessages] = useState([]); // {from: 'user' | 'bot', text: string}[]
  // Controlled message input.
  const [input, setInput] = useState("");
  // Prevent duplicate submissions while the backend responds.
  const [loading, setLoading] = useState(false);
  // Selected category badge to steer the backend prompt.
  const [selectedTopic, setSelectedTopic] = useState(null); // 'healthy' | 'protein' | 'fat_loss' | null
  // Suggested follow-up chips surfaced by SEA-LION.
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);

  // Hero section metrics keep the marketing column flexible.
  const quickStats = [
    { value: "24/7", label: "Nutrition buddy" },
    { value: "98%", label: "Science-backed tips" },
    { value: "3", label: "Smart topic shortcuts" },
  ];

  // Pre-built starter prompts for the hero CTA buttons.
  const heroPrompts = [
    "Plan my meals for a busy work week.",
    "Help me balance macros for muscle gain.",
    "Bust a popular diet myth for me.",
  ];

  // Convert lightweight markdown (bold text) to JSX fragments.
  const renderInlineContent = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={`bold-${idx}`}>{part.slice(2, part.length - 2)}</strong>
        );
      }
      return <React.Fragment key={`frag-${idx}`}>{part}</React.Fragment>;
    });
  };

  // Break a text segment into paragraphs and bullets for readability.
  const renderTextSegment = (segment) => {
    const trimmed = segment.trim();
    if (!trimmed) return null;

    const lines = trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const elements = [];
    let bullets = [];

    const flushBullets = () => {
      if (!bullets.length) return;
      elements.push(
        <ul className="msg-bullet-list" key={`bullets-${elements.length}`}>
          {bullets.map((item, idx) => (
            <li key={`bullet-${idx}`}>{renderInlineContent(item)}</li>
          ))}
        </ul>
      );
      bullets = [];
    };

    lines.forEach((line) => {
      if (/^[-*•]/.test(line)) {
        bullets.push(line.replace(/^[-*•]\s*/, ""));
      } else {
        flushBullets();
        elements.push(
          <p className="msg-text" key={`text-${elements.length}`}>
            {renderInlineContent(line)}
          </p>
        );
      }
    });

    flushBullets();
    return elements;
  };

  // Submit flow: optimistic user bubble, fetch backend, append response.
  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { from: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          topic: selectedTopic,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [...prev, { from: "bot", text: data.reply }]);
        setSuggestedQuestions(data.suggestedQuestions || []);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            from: "bot",
            text: data.error || data.reply || "Something went wrong.",
          },
        ]);
        setSuggestedQuestions([]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { from: "bot", text: "Network error talking to backend." },
      ]);
      setSuggestedQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Topic buttons immediately update state and send a seeded prompt.
  const handleTopicClick = (topic) => {
    setSelectedTopic(topic);
    sendMessage(`Start a ${topic} nutrition conversation.`);
  };

  return (
    <div className="page">
      <div className="layout">
        {/* Marketing / hero column */}
        <section className="hero-panel">
          <p className="hero-eyebrow">SEA-LION Powered</p>
          <h1>
            NutriHealth Coach{" "}
            <span>Clarity, Science, and Encouragement in every reply.</span>
          </h1>
          <p className="hero-copy">
            Personalize your nutrition plan, debunk confusing myths, and explore
            practical food swaps with a friendly specialist that thinks in real
            time.
          </p>

          <div className="hero-metrics">
            {quickStats.map((stat) => (
              <div key={stat.label} className="metric-card">
                <div className="metric-value">{stat.value}</div>
                <div className="metric-label">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="hero-prompts">
            {heroPrompts.map((prompt) => (
              <button
                key={prompt}
                className="prompt-chip"
                onClick={() => sendMessage(prompt)}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="hero-card">
            <div>
              <p className="hero-card-title">Latest wellness insight</p>
              <p className="hero-card-body">
                "Higher fiber breakfasts help with satiety, energy, and gut
                health. Ask for fiber-forward recipes!"
              </p>
            </div>
            <button
              className="hero-cta"
              onClick={() => sendMessage("Share fiber-rich breakfast ideas.")}
              disabled={loading}
            >
              Ask the coach &gt;
            </button>
          </div>
        </section>

        {/* Chat experience column */}
        <section className="chat-shell">
          <div className="chat-card">
            <header className="chat-header">
              <div className="logo-circle">NH</div>
              <div>
                <div className="logo-title">NutriHealth Concierge</div>
                <div className="logo-subtitle">
                  Evidence-first nutrition answers tailored to you
                </div>
              </div>
              <div className="status-chip">Live - SEA-LION v3</div>
            </header>

            <main className="chat-window">
              {/* Friendly greeting when no thread exists */}
              {messages.length === 0 && (
                <div className="bot-bubble">
                  Hello! I&apos;m your nutrition buddy. Ask me anything about
                  meals, nutrients, or diet myths.
                </div>
              )}

              {/* Render each bubble with lightweight markdown support */}
              {messages.map((m, i) => {
                const segments = m.text.split("```");
                return (
                  <div
                    key={i}
                    className={`msg-row ${
                      m.from === "user" ? "right" : "left"
                    }`}
                  >
                    <div className={`msg-bubble ${m.from}`}>
                      {segments.map((segment, segIdx) => {
                        const isCode = segIdx % 2 === 1;
                        if (!segment.trim()) {
                          return null;
                        }
                        if (isCode) {
                          const [langLine, ...codeLines] = segment
                            .split("\n")
                            .filter(Boolean);
                          const codeContent =
                            codeLines.length === 0
                              ? langLine
                              : codeLines.join("\n");
                          const language =
                            codeLines.length === 0 ? "" : langLine ?? "";
                          return (
                            <pre
                              key={`code-${segIdx}`}
                              className={`code-block ${language}`}
                            >
                              {codeContent}
                            </pre>
                          );
                        }
                        const blocks = renderTextSegment(segment);
                        if (!blocks) return null;
                        return blocks.map((block, blockIdx) =>
                          React.cloneElement(block, {
                            key: `text-${segIdx}-${blockIdx}`,
                          })
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="msg-row left">
                  <div className="msg-bubble bot typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
            </main>

            {/* Topic shortcut buttons */}
            <div className="topic-row">
              <button
                className={`topic-btn ${
                  selectedTopic === "healthy" ? "topic-active" : ""
                }`}
                onClick={() => handleTopicClick("healthy")}
                disabled={loading}
              >
                Healthy Meal Ideas
              </button>
              <button
                className={`topic-btn ${
                  selectedTopic === "protein" ? "topic-active" : ""
                }`}
                onClick={() => handleTopicClick("protein")}
                disabled={loading}
              >
                Protein Ideas
              </button>
              <button
                className={`topic-btn ${
                  selectedTopic === "fat_loss" ? "topic-active" : ""
                }`}
                onClick={() => handleTopicClick("fat_loss")}
                disabled={loading}
              >
                Fat Loss Meals Ideas
              </button>
            </div>

            {/* Suggested follow-up chips */}
            {suggestedQuestions.length > 0 && (
              <div className="suggestions-row">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    className="suggestion-chip"
                    onClick={() => sendMessage(q)}
                    disabled={loading}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Composer */}
            <div className="input-row">
              <input
                className="chat-input"
                placeholder="Ask about nutrition, meal ideas, or dietary guidance..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={loading}
              />
              <button
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={loading}
              >
                {loading ? "..." : "Send"}
              </button>
            </div>

            {/* Legal reminder required by brief */}
            <div className="disclaimer">
              This chatbot provides educational information only and is not
              medical advice. Always consult healthcare professionals for
              medical advice.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
