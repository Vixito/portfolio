import { useState, useEffect, useRef } from "react";

interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  duration?: number;
}

interface RadioState {
  isPlaying: boolean;
  isLive: boolean;
  currentSong: Song | null;
}

// Hook compartido para el estado de la radio
// Esto permite que RadioPlayer en HomeSection acceda al estado de la página Radio
export function useRadioState(): RadioState {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);

  // Escuchar eventos personalizados desde la página Radio
  useEffect(() => {
    const handleRadioUpdate = (e: CustomEvent<RadioState>) => {
      setIsPlaying(e.detail.isPlaying);
      setIsLive(e.detail.isLive);
      setCurrentSong(e.detail.currentSong);
    };

    window.addEventListener(
      "radioStateUpdate",
      handleRadioUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        "radioStateUpdate",
        handleRadioUpdate as EventListener
      );
    };
  }, []);

  return { isPlaying, isLive, currentSong };
}

// Función para emitir actualizaciones del estado de la radio
export function emitRadioState(state: RadioState) {
  const event = new CustomEvent("radioStateUpdate", { detail: state });
  window.dispatchEvent(event);
}
