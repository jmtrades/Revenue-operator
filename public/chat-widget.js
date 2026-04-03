/**
 * Recall Touch Chat Widget - Embeddable JavaScript
 * Add to your website to enable live chat with visitors
 *
 * Usage:
 * <script src="https://app.recalltouch.com/chat-widget.js"
 *         data-workspace-id="YOUR_WORKSPACE_ID"></script>
 */

(function() {
  &quot;use strict&quot;;

  // Configuration
  const config = {
    workspaceId: document.currentScript?.getAttribute(&quot;data-workspace-id&quot;),
    origin: document.currentScript?.getAttribute(&quot;data-origin&quot;) || &quot;https://app.recalltouch.com&quot;,
    containerUrl: null,
    widgetConfig: null,
    sessionId: null,
    sessionToken: null,
  };

  // Helper: Get or create session
  async function getOrCreateSession() {
    const stored = localStorage.getItem(`recall_chat_session_${config.workspaceId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        config.sessionId = parsed.sessionId;
        config.sessionToken = parsed.sessionToken;
        return;
      } catch (e) {
        localStorage.removeItem(`recall_chat_session_${config.workspaceId}`);
      }
    }

    // Create new session
    const visitorName = prompt(&quot;Your name:&quot;) || `Visitor ${Math.random().toString(36).substring(7)}`;
    const visitorEmail = prompt(&quot;Your email (optional):&quot;) || undefined;

    try {
      const response = await fetch(`${config.origin}/api/chat-widget/sessions`, {
        method: &quot;POST&quot;,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: config.workspaceId,
          visitor_name: visitorName,
          visitor_email: visitorEmail,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        config.sessionId = data.id;
        config.sessionToken = data.session_token;
        localStorage.setItem(
          `recall_chat_session_${config.workspaceId}`,
          JSON.stringify({
            sessionId: config.sessionId,
            sessionToken: config.sessionToken,
          })
        );
      }
    } catch (error) {
      console.error(&quot;[Recall Chat Widget] Failed to create session:&quot;, error);
    }
  }

  // Helper: Load widget configuration
  async function loadWidgetConfig() {
    try {
      const response = await fetch(
        `${config.origin}/api/chat-widget/config?workspace_id=${encodeURIComponent(config.workspaceId)}`
      );
      if (response.ok) {
        config.widgetConfig = await response.json();
        return true;
      }
    } catch (error) {
      console.error(&quot;[Recall Chat Widget] Failed to load config:&quot;, error);
    }
    return false;
  }

  // Helper: Load messages
  async function loadMessages() {
    if (!config.sessionId || !config.sessionToken) return [];

    try {
      const response = await fetch(
        `${config.origin}/api/chat-widget/messages?session_id=${encodeURIComponent(
          config.sessionId
        )}&session_token=${encodeURIComponent(config.sessionToken)}`
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error(&quot;[Recall Chat Widget] Failed to load messages:&quot;, error);
    }
    return [];
  }

  // Helper: Send message
  async function sendMessage(messageText) {
    if (!config.sessionId || !config.sessionToken) return null;

    try {
      const response = await fetch(`${config.origin}/api/chat-widget/messages`, {
        method: &quot;POST&quot;,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: config.sessionId,
          session_token: config.sessionToken,
          message_text: messageText,
          sender_type: &quot;visitor&quot;,
          sender_name: &quot;Visitor&quot;,
        }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error(&quot;[Recall Chat Widget] Failed to send message:&quot;, error);
    }
    return null;
  }

  // Create and manage the widget UI
  function createWidget() {
    const cfg = config.widgetConfig || {};
    const accentColor = cfg.accent_color || &quot;#3b82f6&quot;;
    const position = cfg.position || &quot;bottom-right&quot;;
    const greetingMessage = cfg.greeting_message || &quot;Hi! How can we help you today?&quot;;
    const agentName = cfg.agent_name || &quot;Support Agent&quot;;
    const avatarUrl = cfg.avatar_url || null;

    // Create container
    const container = document.createElement(&quot;div&quot;);
    container.id = &quot;recall-chat-widget&quot;;
    container.style.cssText = `
      position: fixed;
      ${position === "bottom-left" ? "left: 20px;" : "right: 20px;"}
      bottom: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, &apos;Segoe UI&apos;, &apos;Roboto&apos;, &apos;Oxygen&apos;,
        &apos;Ubuntu&apos;, &apos;Cantarell&apos;, &apos;Fira Sans&apos;, &apos;Droid Sans&apos;, &apos;Helvetica Neue&apos;,
        sans-serif;
    `;

    // Create button
    const button = document.createElement(&quot;button&quot;);
    button.id = &quot;recall-chat-button&quot;;
    button.style.cssText = `
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      background-color: ${accentColor};
      color: white;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      transition: transform 0.2s, box-shadow 0.2s;
    `;
    button.innerHTML = &quot;💬&quot;;
    button.title = &quot;Open chat&quot;;

    // Create chat window
    const chatWindow = document.createElement(&quot;div&quot;);
    chatWindow.id = &quot;recall-chat-window&quot;;
    chatWindow.style.cssText = `
      position: absolute;
      ${position === "bottom-left" ? "left: 0;" : "right: 0;"}
      bottom: 80px;
      width: 384px;
      height: 600px;
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
      display: none;
      flex-direction: column;
      overflow: hidden;
      animation: slideIn 0.3s ease-out;
    `;

    // Header
    const header = document.createElement(&quot;div&quot;);
    header.style.cssText = `
      background-color: ${accentColor};
      color: white;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    `;

    const headerContent = document.createElement(&quot;div&quot;);
    headerContent.style.cssText = &quot;flex: 1;&quot;;
    const headerTitle = document.createElement(&quot;div&quot;);
    headerTitle.style.cssText =
      &quot;font-weight: 600; font-size: 16px; margin-bottom: 4px;&quot;;
    headerTitle.textContent = agentName;
    const headerSubtitle = document.createElement(&quot;div&quot;);
    headerSubtitle.style.cssText = &quot;font-size: 12px; opacity: 0.9;&quot;;
    headerSubtitle.textContent = &quot;Online&quot;;
    headerContent.appendChild(headerTitle);
    headerContent.appendChild(headerSubtitle);
    header.appendChild(headerContent);

    const closeBtn = document.createElement(&quot;button&quot;);
    closeBtn.innerHTML = &quot;✕&quot;;
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeBtn.onclick = () => toggleChat(false);
    header.appendChild(closeBtn);

    // Messages container
    const messagesContainer = document.createElement(&quot;div&quot;);
    messagesContainer.id = &quot;recall-chat-messages&quot;;
    messagesContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background-color: #f9fafb;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    // Initial greeting
    const greeting = document.createElement(&quot;div&quot;);
    greeting.style.cssText = `
      background-color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      color: #374151;
      border-left: 3px solid ${accentColor};
    `;
    greeting.textContent = greetingMessage;
    messagesContainer.appendChild(greeting);

    // Input area
    const inputArea = document.createElement(&quot;div&quot;);
    inputArea.style.cssText = `
      padding: 12px 16px;
      border-top: 1px solid #e5e7eb;
      background-color: white;
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    `;

    const input = document.createElement(&quot;input&quot;);
    input.type = &quot;text&quot;;
    input.placeholder = &quot;Type a message...&quot;;
    input.style.cssText = `
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 14px;
      font-family: inherit;
      outline: none;
      transition: border-color 0.2s;
    `;
    input.onkeypress = (e) => {
      if (e.key === &quot;Enter&quot; && input.value.trim()) {
        sendMessageHandler();
      }
    };

    const sendBtn = document.createElement(&quot;button&quot;);
    sendBtn.innerHTML = &quot;→&quot;;
    sendBtn.style.cssText = `
      background-color: ${accentColor};
      color: white;
      border: none;
      border-radius: 6px;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 18px;
      transition: opacity 0.2s;
      font-weight: bold;
    `;
    sendBtn.onclick = sendMessageHandler;

    inputArea.appendChild(input);
    inputArea.appendChild(sendBtn);

    // Assemble chat window
    chatWindow.appendChild(header);
    chatWindow.appendChild(messagesContainer);
    chatWindow.appendChild(inputArea);

    // Add CSS animation
    const style = document.createElement(&quot;style&quot;);
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      #recall-chat-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }
      #recall-chat-messages::-webkit-scrollbar {
        width: 6px;
      }
      #recall-chat-messages::-webkit-scrollbar-track {
        background: #f1f5f9;
      }
      #recall-chat-messages::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);

    // Toggle chat visibility
    function toggleChat(show) {
      if (show === undefined) {
        show = chatWindow.style.display === &quot;none&quot;;
      }
      chatWindow.style.display = show ? &quot;flex&quot; : &quot;none&quot;;
      button.style.transform = show ? &quot;scale(1)&quot; : &quot;scale(1)&quot;;
    }

    // Send message handler
    async function sendMessageHandler() {
      const messageText = input.value.trim();
      if (!messageText) return;

      input.value = &quot;&quot;;
      input.disabled = true;
      sendBtn.disabled = true;

      // Add user message to UI
      const userMessageEl = document.createElement(&quot;div&quot;);
      userMessageEl.style.cssText = `
        align-self: flex-end;
        background-color: ${accentColor};
        color: white;
        padding: 10px 14px;
        border-radius: 8px;
        max-width: 80%;
        word-wrap: break-word;
        font-size: 14px;
      `;
      userMessageEl.textContent = messageText;
      messagesContainer.appendChild(userMessageEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // Send to API
      const result = await sendMessage(messageText);

      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();

      // Reload messages
      const messages = await loadMessages();
      updateMessagesUI(messages);
    }

    // Update messages UI
    function updateMessagesUI(messages) {
      // Clear and rebuild
      messagesContainer.innerHTML = &quot;&quot;;
      const greeting2 = document.createElement(&quot;div&quot;);
      greeting2.style.cssText = `
        background-color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        color: #374151;
        border-left: 3px solid ${accentColor};
      `;
      greeting2.textContent = greetingMessage;
      messagesContainer.appendChild(greeting2);

      messages.forEach((msg) => {
        const msgEl = document.createElement(&quot;div&quot;);
        msgEl.style.cssText = `
          ${msg.sender_type === "agent" ? "align-self: flex-start;" : "align-self: flex-end;"}
          background-color: ${msg.sender_type === "agent" ? "white" : accentColor};
          color: ${msg.sender_type === "agent" ? "#374151" : "white"};
          padding: 10px 14px;
          border-radius: 8px;
          max-width: 80%;
          word-wrap: break-word;
          font-size: 14px;
          ${msg.sender_type === "agent" ? "border: 1px solid #e5e7eb;" : ""}
        `;
        msgEl.textContent = msg.message_text;
        messagesContainer.appendChild(msgEl);
      });

      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Toggle on button click
    button.addEventListener(&quot;mouseenter&quot;, function() {
      this.style.transform = &quot;scale(1.1)&quot;;
    });
    button.addEventListener(&quot;mouseleave&quot;, function() {
      this.style.transform = &quot;scale(1)&quot;;
    });
    button.addEventListener(&quot;click&quot;, () => toggleChat());

    // Assemble and add to DOM
    container.appendChild(button);
    container.appendChild(chatWindow);
    document.body.appendChild(container);

    // Start polling for new messages
    setInterval(async () => {
      if (chatWindow.style.display !== &quot;none&quot;) {
        const messages = await loadMessages();
        updateMessagesUI(messages);
      }
    }, 3000);

    return { toggleChat, updateMessagesUI };
  }

  // Initialize
  window.RecallChatWidget = {
    init: async function(options) {
      if (options.workspaceId) {
        config.workspaceId = options.workspaceId;
      }
      if (options.origin) {
        config.origin = options.origin;
      }

      if (!config.workspaceId) {
        console.error(&quot;[Recall Chat Widget] workspace_id is required&quot;);
        return;
      }

      // Load configuration
      const configLoaded = await loadWidgetConfig();
      if (!configLoaded || !config.widgetConfig?.enabled) {
        console.warn(&quot;[Recall Chat Widget] Widget is not enabled&quot;);
        return;
      }

      // Get or create session
      await getOrCreateSession();

      // Create widget UI
      const widget = createWidget();

      // Auto-open if configured
      if (config.widgetConfig?.auto_open_delay && config.widgetConfig.auto_open_delay > 0) {
        setTimeout(() => {
          widget.toggleChat(true);
        }, config.widgetConfig.auto_open_delay * 1000);
      }
    },
  };

  // Auto-init if data attribute is present
  if (document.currentScript?.hasAttribute(&quot;data-workspace-id&quot;)) {
    document.addEventListener(&quot;DOMContentLoaded&quot;, () => {
      window.RecallChatWidget.init({
        workspaceId: document.currentScript?.getAttribute(&quot;data-workspace-id&quot;),
      });
    });
  }
})();
