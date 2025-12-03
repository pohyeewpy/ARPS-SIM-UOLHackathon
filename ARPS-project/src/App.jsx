import { useState, useEffect, useRef } from "react";
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

    const [messages, setMessages] = useState([
        {
            role: "bot",
            text: "Hello! I'm your nutrition buddy. I can help you with nutritional information, meal planning and food choices based on scientific research 😊",quickReplies: []
        }
    ]);

    const [input, setInput] = useState("");


    // Auto scroll to bottom with new message
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({behavior: "smooth"});
    }, [messages]);



    
    // CallBackend for chat replApp.y

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
        // Add user message
        setMessages((prev) => [...prev, { role: "user", text: input }]);
       
        setInput("");

        // Placeholder bot reply
        setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                { role: "bot", text: "Typing...",  quickReplies: [] }
            ]);
        }, 800);
        try {
            const botText = await callBackend(userMsg);

            // Remove typing bubble, add bot reply
            setMessages(prev => [
                ...prev.slice(0, -1),
                { role: "bot", text: botText.reply, quickReplies: botText.quickReplies || [], topic: botText.topic
                } 
            ]);
        } catch (err) {
            console.error("Backend error:", err);
            setMessages(prev => [
                ...prev.slice(0, -1),
                { role: "bot", text: "System error, please try again later." , quickReplies: [] }
            ]);
    }
};

    // QUICK ACTION BUTTON FUNCTION
    const quickAsk = async (presetMsg, topic) => {
        // show user message
        setMessages(prev => [...prev, { role: "user", text: presetMsg }]);
        // show typing
        setMessages(prev => [...prev, { role: "bot", text: "Typing...", quickReplies: [] }]);
        try {
            const botText = await callBackend(presetMsg, topic);
            setMessages(prev => [
                ...prev.slice(0, -1),
                { role: "bot", text: botText.reply, quickReplies: botText.quickReplies || [], topic: botText.topic
                }
            ]);
        } catch {
            setMessages(prev => [
                ...prev.slice(0, -1),
                { role: "bot", text: "System error, please try again later.", quickReplies: [] }
            ]);
        }
    };

    return (
        <div className="w-full h-screen bg-gray-100 flex flex-col">

            {/* HEADER */}
            <div className="bg-green-300 h-20 px-6 flex items-center gap-3 shadow-sm">
                {/* Logo */}
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow">
                    <img
                        src="/vite.svg"
                        alt="User"
                        className="w-6 h-6 object-contain"
                    />
               </div>

                {/* Title */}
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold text-green-900">NutriHealth</h1>
                    <p className="text-sm text-green-900/70">
                        Your #1 health & nutrition information chat-bot
                    </p>
                </div>
            </div>

            {/* CHAT AREA container */}
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex mb-4 gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>

                        {/* Icon */}
                        {/* Bot left icon alignment and image link */}
                        {msg.role === "bot" && (
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 bg-green-500">
                                <img
                                    src="/vite.svg"
                                    alt="Bot"
                                    className="w-6 h-6 object-contain"
                                />
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
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 bg-green-700">
                                <img
                                    src="/vite.svg"
                                    alt="User"
                                    className="w-6 h-6 object-contain"
                                />
                            </div>
                        )}

                    </div>
                ))}

                {/* Auto scroller anchor */}
                <div ref={bottomRef}></div>
            </div>
            

            {/* QUICK ACTION BUTTONS */}
            <div className="px-6 py-2 flex gap-4 justify-center flex-wrap">
                <button onClick={() => quickAsk("Give me healthy meal ideas", "healthy")} className="flex items-center gap-2 bg-green-200 px-4 py-2 rounded-full text-green-900 shadow-sm hover:bg-green-300">
                    Healthy Meal Ideas
                </button>

                <button onClick={() => quickAsk("Give me high protein meal ideas", "protein")} className="flex items-center gap-2 bg-green-200 px-4 py-2 rounded-full text-green-900 shadow-sm hover:bg-green-300">
                    Protein Ideas
                </button>

                <button onClick={() => quickAsk("Give me fat loss friendly meals ideas", "fat_loss")} className="flex items-center gap-2 bg-green-200 px-4 py-2 rounded-full text-green-900 shadow-sm hover:bg-green-300">
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
                    className="bg-green-400 hover:bg-green-500 px-5 py-3 text-white rounded-xl font-semibold shadow"
                >
                    Send ➤
                </button>
            </div>

            {/* DISCLAIMER */}
            <p className="text-center text-gray-500 text-xs px-6 pb-4">
                This chatbot provides educational information only and is not medical advice.
                Always consult healthcare professionals for medical advice.
            </p>

        </div>
    );
}