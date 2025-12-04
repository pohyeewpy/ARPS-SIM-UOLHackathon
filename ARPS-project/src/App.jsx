import { useState, useEffect, useRef } from "react";
import { Menu, ChevronLeft, Clock, BookOpen, Plus, MessageSquare, Trash2, Send, Salad, Drumstick, HeartPlus, UserRound } from "lucide-react";
import { marked } from "marked";

marked.setOptions({
    breaks: true,
    smartLists: true,
    smartypants: true
});

// perform text formatting before markdown parsing to show 
function normalizeAIText(text) {
    if (!text) return "";
    return text
        .replace(/^\* \*\*/gm, "- **")      
        .replace(/^\* /gm, "- ")            
        .replace(/\. \* /g, ".\n- ")        
        .replace(/\n\* /g, "\n- ")          
        .replace(/\s{2,}/g, " ")            
        .trim();
}

function formatMealsSmart(text) {
    if (!text) return text;

    // Remove stray markdown
    let t = text.replace(/\*\*/g, "").replace(/\*/g, "").trim();

    const headers = ["Breakfast", "Lunch", "Dinner", "Snack"];
    let sections = {};
    let introText = "";
    let foundAnyHeader = false;

    let parts = t.split(/(?=(Breakfast|Lunch|Dinner|Snack):)/gi);

    if (parts.length === 1) {
        parts = t.split(/[\n\.]+/).map(s => s.trim());
    }

    for (let rawPart of parts) {
        let part = rawPart.trim();
        if (!part) continue;

        let header = headers.find(h =>
            part.toLowerCase().startsWith(h.toLowerCase())
        );

        if (!header) {
            header = headers.find(h =>
                part.toLowerCase().includes(h.toLowerCase() + ":")
            );
        }

        if (header) {
            foundAnyHeader = true;

            let content = part.split(/:/).slice(1).join(":").trim();
            sections[header] = (sections[header] || "") + " " + content;

        } else {
            if (!foundAnyHeader) {
                introText += part + " ";
            }
        }
    }

    if (!foundAnyHeader) return text;

    let result = introText.trim() ? introText.trim() + "\n\n" : "";
    const order = ["Breakfast", "Lunch", "Dinner", "Snack"];

    for (let h of order) {
        if (sections[h]) {
            result += `**${h}:**\n- ${sections[h].trim()}\n\n`;
        }
    }

    return result.trim();
}

export default function App() {

    // Icons
    useEffect(() => {
        const link = document.createElement("link");
        link.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200";
        link.rel = "stylesheet";
        document.head.appendChild(link);
    },[]);

    // Sidebar
    //==========================================
    // Sidebar action
    const [sidebarOpen, setSidebarOpen] = useState(true);
    // Active chat
    const [currentChatId, setCurrentChatId] = useState(1);
    // All chat data
    const [chats, setChats] = useState([
        {
            id: 1,
            title: "New Chat",
            messages: [
                {
                    role: "bot",
                    text: "Hello! I'm your nutrition buddy. I can help you with nutritional information, meal planning and food choices based on scientific research 😊",quickReplies: []
                }
            ]
        }
    ]);

    // User message input state
    const [input, setInput] = useState("");

    // Auto scroll to bottom with new message
    const bottomRef = useRef(null);

    // Resources component
    const resources = [
        {title: "HealthHub: Nutrition Facts and Tips on Eating Healthy",
            desc: "Contributed by Health Promotion Board",
            url: "https://www.healthhub.sg/programmes/nutrition-hub#home"
        }
    ]

    // Retrieve current chat
    const currentChat = chats.find(c => c.id === currentChatId);
    const messages = currentChat ? currentChat.messages : [];

    useEffect(() => {
        bottomRef.current?.scrollIntoView({behavior: "smooth"});
    }, [chats, currentChatId]);


    //--------------------------------------------------------------
    // CallBackend for chat reply

    async function callBackend(userMessage, topic = "general") {
        const response = await fetch("http://localhost:5000/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: userMessage,
                topic: topic
            })
        });

        const data = await response.json();
        return data;     
    }
    
    const sendMessage = async() => {
        if (!input.trim()) return;
        const userMsg = input;
        // add user message
        setChats(prev => prev.map(chat =>
            chat.id === currentChatId
                ? { ...chat, messages: [...chat.messages, {role: "user", text: userMsg}] }
                : chat
        ));
       
        setInput("");

        // placeholder bot reply
        setTimeout(() => {
            setChats(prev => prev.map(chat =>
                chat.id === currentChatId
                    ? { ...chat, messages: [...chat.messages, {role: "bot", text: "Typing...", quickReplies: [] }] }
                    : chat

            ));
        }, 800);
        try {
            const botText = await callBackend(userMsg);

            // Remove typing bubble, add bot reply
            setChats(prev => prev.map(chat => {
                if (chat.id === currentChatId) {
                    return {
                        ...chat,
                        messages: [
                            ...chat.messages.slice(0, -1),
                            {
                                role: "bot",
                                text: botText.reply,
                                quickReplies: botText.quickReplies || [],
                                topic: botText.topic
                            }
                        ]
                    };
                }
                return chat;
            }));
        } catch (err) {
            console.error("Backend error:", err);
            setChats(prev => prev.map(chat => {
                if (chat.id === currentChatId) {
                    return {
                        ...chat,
                        messages: [
                            ...chat.messages.slice(0, -1),
                            { role: "bot", text: "System error, please try again later." , quickReplies: [] }
                        ]
                    };
                }
                return chat;
            }));
        }
    };

    // QUICK ACTION BUTTON FUNCTION
    const quickAsk = async (presetMsg, topic = "general") => {
        // show user message
        setChats(prev =>
            prev.map(chat =>
                chat.id === currentChatId
                    ? { ...chat, messages: [...chat.messages, { role: "user", text: presetMsg }]}
                    : chat
            )
        );

        // Typing
        setTimeout(() => {
            setChats(prev => prev.map(chat =>
                chat.id === currentChatId ? {
                        ...chat,
                        messages: [...chat.messages, {role: "bot", text: "Typing...", quickReplies: []}]
                    }
                    : chat
            ));
        }, 250);
        try {
            const botText = await callBackend(presetMsg, topic);
            setChats(prev => prev.map(chat => {
                if (chat.id === currentChatId) {
                    return {
                        ...chat,
                        messages: [...chat.messages.slice(0, -1), {
                            role: "bot",
                            text: botText.reply,
                            quickReplies: botText.quickReplies || [],
                            topic: botText.topic
                        }],
                    };
                }
                return chat;
            }));
        } catch {
            setChats(prev =>
                prev.map(chat =>
                    chat.id === currentChatId
                        ? {...chat, messages: [...chat.messages.slice(0,-1), { role: "bot", text: "System error, please try again later.", quickReplies: [] }]}
                        : chat
                )
            );
        }
    };

    // Start new chat
    const startNewChat = () => {
        const newId = Math.max(...chats.map(c => c.id)) + 1;
        const newChat = {
            id: newId,
            title: "New Chat",
            messages: [
                {
                    role: "bot",
                    text: "Hello! I'm your nutrition buddy. I can help you with nutritional information, meal planning and food choices based on scientific research 😊",
                    quickReplies: []
                }
            ]
        };
        setChats([...chats, newChat]);
        setCurrentChatId(newId);
    };

    /* Delete a conversation */
    const deleteChat = (chatId, e) => {
        e?.stopPropagation?.();
        if (chats.length <= 1) return; // keep at least one chat

        const filtered = chats.filter((c) => c.id !== chatId);
        setChats(filtered);

        // If current was deleted, pick the first remaining
        if (currentChatId === chatId) {
            setCurrentChatId(filtered[0].id);
        }
    };

    // -------------------------------------------------------------------------------------------------
    // Chat UI

    return (
        <div className="flex h-screen bg-gray-100 overflow-hidden">

            {/* SIDEBAR */}
            <aside className={`bg-gray-900 text-white transition-all duration-300 flex flex-col ${
                sidebarOpen ? "w-72" : "w-0"
            } overflow-hidden`}>

                {/* Sidebar Header */}
                <div className="h-20 flex items-center justify-between px-4 bg-gray-800 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                            <img src="/NutriHealthLogo.png" alt="Logo" className="w-7 h-7 object-contain" />
                        </div>
                        <div>
                            <h2 className="font-bold">NutriHealth</h2>
                            <p className="text-xs text-gray-400">Nutrition Assistant</p>
                        </div>
                    </div>

                    <button onClick={() => setSidebarOpen(false)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            aria-label="Close sidebar"
                    >
                        <ChevronLeft size={20} />
                    </button>
                </div>

                {/* New Chat Button */}
                <div className="p-3 border-b border-gray-700">
                    <button
                        onClick={startNewChat}
                        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg transition-colors font-medium"
                    >
                        <Plus size={20} />
                        New Chat
                    </button>
                </div>

                {/* Chat History */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-3">
                        <div className="flex items-center gap-2 px-2 py-2 text-gray-400 text-sm font-medium mb-2">
                            <Clock size={16} />
                            <span>Recent Chats</span>
                        </div>

                        {[...chats].reverse().map((chat) => (
                            <button
                                key={chat.id}
                                onClick={() => setCurrentChatId(chat.id)}
                                className={`w-full text-left px-3 py-3 rounded-lg mb-2 transition-colors group ${
                                    currentChatId === chat.id
                                        ? 'bg-gray-800 text-white'
                                        : 'text-gray-300 hover:bg-gray-800'
                                }`}
                            >
                                <div className="flex items-start gap-2">
                                    <MessageSquare size={16} className="mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate">{chat.title}</div>
                                        <div className="text-xs text-gray-500">
                                            {chat.messages.length} messages
                                        </div>
                                    </div>
                                    {chats.length > 1 && (
                                        <button
                                            onClick={(e) => deleteChat(chat.id, e)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-700 rounded transition-opacity"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Resources */}
                <div className="border-t border-gray-700 p-3">
                    <div className="flex items-center gap-2 px-2 py-2 text-gray-400 text-sm font-medium">
                        <BookOpen size={16} />
                        <span>More resources</span>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                        {resources.map((resource, idx) => (
                            <a key={idx}
                               href={resource.url}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="w-full text-left px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors block">


                                <div className="text-sm font-medium">{resource.title}</div>
                                <div className="text-xs text-gray-500">{resource.desc}</div>
                            </a>
                        ))}
                    </div>
                </div>
            </aside>
            {/* -------------------------------------------------------------------------------------------------------- */}
            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-green-300 h-20 px-6 flex items-center gap-3 shadow-sm">
                    {!sidebarOpen && (
                        <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-green-400 rounded-lg transition-colors">
                            <Menu size={24} className="text-green-900" />
                        </button>
                    )}

                    {/* Logo */}
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow">
                        <img src="/NutriHealthLogo.png" alt="User" className="w-8 h-8 object-contain" />
                    </div>

                    {/* Title */}
                    <div className="flex flex-col">
                        <h1 className="text-xl font-bold text-green-900">NutriHealth</h1>
                        <p className="text-sm text-green-900/70">Your #1 health & nutrition information chatbot</p>
                    </div>
                </div>

                {/* CHAT AREA container */}
                <main className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
                    {currentChat && currentChat.messages.map((msg, index) => (
                        <div key={index} className={`flex mb-4 gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>

                            {/* Icon */}
                            {/* Bot left icon alignment and image link */}
                            {msg.role === "bot" && (
                                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 bg-green-500">
                                    <UserRound size={20} color={"white"} />
                                </div>
                            )}

                            {/* Message box */}
                           <div
                                className={`max-w-[75%] p-4 rounded-2xl shadow-sm ${
                                    msg.role === "bot"
                                        ? "bg-white text-gray-800 border"
                                        : "bg-green-200 text-gray-900"
                                }`}
                            >
                            {/* Fixed formatting*/}
                            <div
                                className="prose prose-sm"
                                dangerouslySetInnerHTML={{
                                    __html: (() => {
                                        let cleaned = normalizeAIText(msg.text || "");

                                        let hasMealHeaders =
                                            /(breakfast|lunch|dinner|snack)\s*:/i.test(cleaned);

                                        let finalText = hasMealHeaders
                                            ? formatMealsSmart(cleaned)
                                            : cleaned;

                                        return marked(finalText);
                                    })()
                                }}
                            />

                            {/* Quick replies button */}
                            {msg.quickReplies?.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {msg.quickReplies.map((qr, i) => (
                                        <button
                                            key={i}
                                            onClick={() => quickAsk(qr, msg.topic)}
                                            className="px-4 py-2 bg-gray-200 rounded-full text-gray-700 shadow hover:bg-gray-300"
                                        >
                                            {qr}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                            {/* User right icon alignment and image link */}
                            {msg.role === "user" && (
                                <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 bg-gray-300">
                                    <UserRound size={20} color={"gray"} />
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Auto scroller anchor */}
                    <div ref={bottomRef}></div>
            </main>                    
            {/* QUICK ACTION BUTTONS */}
            <div className="px-6 py-2 flex gap-4 justify-center flex-wrap">
                <button onClick={() => quickAsk("Give me healthy meal ideas", "healthy")} className="flex items-center gap-2 bg-green-200 px-4 py-2 rounded-full text-green-900 shadow-sm hover:bg-green-300">
                    <Salad size={20} />
                    Healthy Meal Ideas
                </button>

                <button onClick={() => quickAsk("Give me high protein meal ideas", "protein")} className="flex items-center gap-2 bg-green-200 px-4 py-2 rounded-full text-green-900 shadow-sm hover:bg-green-300">
                    <Drumstick size={20} />                  
                    Protein Ideas
                </button>

                <button onClick={() => quickAsk("Give me fat loss friendly meals ideas", "fat_loss")} className="flex items-center gap-2 bg-green-200 px-4 py-2 rounded-full text-green-900 shadow-sm hover:bg-green-300">
                    <HeartPlus size={20} />                   
                    Fat Loss Meals Ideas
                </button>
            </div>

            <hr className="opacity-40" />

            {/* INPUT BAR */}
            <div className="px-6 py-4 flex items-center gap-3">
                <input
                    className="flex-1 px-4 py-3 bg-white border rounded-xl shadow-sm focus:outline-green-600"
                    placeholder="Ask about nutrition, meal ideas, or dietary guidance ..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />

                <button
                    onClick={sendMessage}
                    className="bg-green-400 hover:bg-green-500 px-5 py-3 text-white rounded-xl font-semibold shadow flex items-center gap-2"                
                >   <Send size={20} />
                    Send 
                </button>
            </div>

            {/* DISCLAIMER */}
            <p className="text-center text-gray-500 text-xs px-6 pb-4">
                This chatbot provides educational information only and is not medical advice.
                Always consult healthcare professionals for medical advice.
            </p>
            </div>
        </div>
    );
}