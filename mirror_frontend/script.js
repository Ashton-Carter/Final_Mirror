const speechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
const wakeWordRecognition = new speechRecognition();
const commandRecognition = new speechRecognition();

let isWakeListening = false;
let isCommandListening = false;

function updateTime() {
    const now = new Date();
    document.getElementById("time").innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    document.getElementById("date").innerText = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

async function getWeather() {
    const API_URL = "http://localhost:3000/weather?location=Orange,CA";

    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        document.getElementById("weather").innerHTML =
            `${data.location.name}, ${data.location.region} <br> Temp:${data.current.temp_f}°F <br> Condition:${data.current.condition.text}`;
        document.getElementById("weather-icon").src = data.current.condition.icon;

    } catch (error) {
        console.error("Error fetching weather data:", error);
    }
}

async function updateCalendar() {
    console.log("Called Update Calendar");
    const events = await getCalendarEvents();
    console.log("EVENTS FROM UPDATE CALENDAR:", events);
    document.getElementById("events").innerHTML = events.map(e => `<li>${e.start}:<br> ${e.title}</li>`).join("");
}

async function getCalendarEvents() {
    const API_URL = "http://localhost:3000/calendar";
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        return parseEvents(data);
    } catch (error) {
        console.error("Error fetching calendar data:", error);
        return [];
    }
}

function parseEvents(events) {
    return events.map(event => ({
        id: event.id,
        title: event.summary,
        description: event.description || "No description available",
        link: event.html_link,
        start: event.start.date || event.start.date_time.substring(0, 10) || "No start time",
        end: event.end.date || event.end.date_time || "No end time"
    }));
}

async function executeCommand(command) {
    const API_URL = "http://localhost:3000/chat";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: command })
        });

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        // Pause wake word detection while playing audio
        if (isWakeListening) {
            wakeWordRecognition.stop();
        }

        audio.play();
        audio.onended = () => {
            if (!isWakeListening) {
                wakeWordRecognition.start();
            }
        };

    } catch (error) {
        console.error("Error sending message:", error);
        if (!isWakeListening) wakeWordRecognition.start();
    }
}

function activationWord() {
    if (!speechRecognition) {
        console.log("Your browser doesn't support the Web Speech API.");
        return;
    }

    // Wake Word Setup
    wakeWordRecognition.continuous = true;
    wakeWordRecognition.interimResults = false;
    wakeWordRecognition.lang = 'en-US';

    commandRecognition.continuous = false;
    commandRecognition.interimResults = false;
    commandRecognition.lang = 'en-US';

    wakeWordRecognition.onstart = () => isWakeListening = true;
    wakeWordRecognition.onend = () => isWakeListening = false;

    commandRecognition.onstart = () => isCommandListening = true;
    commandRecognition.onend = () => {
        isCommandListening = false;
        console.log('Command processing ended.');
        if (!isWakeListening) wakeWordRecognition.start();
    };

    wakeWordRecognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.trim().toLowerCase();
            if (transcript.includes("carter")) {
                console.log("Wake word 'carter' detected.");
                if (isWakeListening) wakeWordRecognition.stop();
                if (!isCommandListening) commandRecognition.start();
                break;
            }
        }
    };

    commandRecognition.onresult = (event) => {
        const command = event.results[0][0].transcript.trim();
        console.log(`Command received: ${command}`);
        executeCommand(command);
    };

    wakeWordRecognition.onerror = (event) => {
        console.error("Wake word recognition error:", event.error);
        if (!isWakeListening) setTimeout(() => wakeWordRecognition.start(), 1000);
    };

    commandRecognition.onerror = (event) => {
        console.error("Command recognition error:", event.error);
        alert("Sorry, I didn’t understand that. Please try again.");
        if (!isWakeListening) wakeWordRecognition.start();
    };

    wakeWordRecognition.start();
}

setInterval(updateTime, 60000);
setInterval(getWeather, 3600000);
setInterval(updateCalendar, 3600000);

activationWord();
setInterval(() => {
    if (!isWakeListening && !isCommandListening) {
        console.log("Watchdog: Wake word listener stopped. Restarting...");
        wakeWordRecognition.start();
    }
}, 10000);

updateTime();
getWeather();
updateCalendar();

// Fullscreen toggle with "f"
document.addEventListener("keydown", function (e) {
    if (e.key === "f" || e.key === "F") {
        const elem = document.documentElement;
        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }
});
