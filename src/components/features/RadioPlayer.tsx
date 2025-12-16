import { useState } from "react";
import { Link } from "react-router-dom";

function RadioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center gap-4">
        <div
          className={`w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center overflow-hidden ${
            isPlaying ? "animate-spin" : ""
          }`}
          style={{
            animationDuration: "3s",
          }}
        >
          <svg
            className="w-8 h-8 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">Radio Vixis</h3>
          <p className="text-sm text-gray-600">En vivo</p>
        </div>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-12 h-12 rounded-lg bg-purple text-white flex items-center justify-center hover:bg-purple/90 transition-colors cursor-pointer"
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <Link
          to="/radio"
          className="text-sm text-purple hover:text-blue transition-colors cursor-pointer inline-flex items-center gap-1 ml-2"
        >
          Ver más
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}

export default RadioPlayer;
