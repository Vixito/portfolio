#!/usr/bin/env node

/**
 * Script para generar la playlist M3U desde Supabase Storage.
 * Reemplaza el script update-playlist.sh que usaba gsutil.
 */

import fs from 'fs';
import path from 'path';

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ ERROR: SUPABASE_URL y SUPABASE_ANON_KEY deben estar definidos en el entorno.");
  process.exit(1);
}

// Configuración del Jingle
let jingleUrl = process.env.RADIO_JINGLE_URL || process.env.VITE_RADIO_JINGLE_URL || "";
const rawInterval = process.env.RADIO_JINGLE_INTERVAL || process.env.VITE_RADIO_JINGLE_INTERVAL || "5";
let jingleInterval = parseInt(rawInterval, 10);
if (isNaN(jingleInterval) || jingleInterval < 1) {
  jingleInterval = 5;
}

const PLAYLIST_FILE = "/tmp/radio-playlist.m3u";

// Función para barajar la playlist (Fisher-Yates)
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function main() {
  try {
    console.log("🔍 Conectando a Supabase Storage (bucket: 'music')...");
    
    // Listar archivos paginados de forma robusta
    let offset = 0;
    const limit = 100;
    const allFiles = [];
    
    while (true) {
      const listUrl = `${supabaseUrl}/storage/v1/object/list/music`;
      const res = await fetch(listUrl, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prefix: '',
          limit,
          offset,
          sortBy: { column: 'name', order: 'asc' }
        })
      });
      
      if (!res.ok) {
        throw new Error(`Error en API de almacenamiento (${res.status} ${res.statusText})`);
      }
      
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        break;
      }
      
      allFiles.push(...data);
      if (data.length < limit) {
        break;
      }
      offset += limit;
    }
    
    console.log(`📁 Encontrados ${allFiles.length} archivos totales en el bucket.`);
    
    // Filtrar canciones de audio
    const audioSongs = allFiles.filter(f => {
      if (!f.id) return false; // Descartar carpetas
      const ext = path.extname(f.name).toLowerCase();
      return ['.mp3', '.m4a', '.ogg', '.wav'].includes(ext);
    });
    
    console.log(`🎵 Encontradas ${audioSongs.length} canciones con formato de audio soportado.`);
    
    // Identificar el jingle en el bucket
    const hasBucketJingle = audioSongs.some(f => f.name.toLowerCase() === 'radio vixis - jingle.m4a');
    
    // Resolver URL del jingle
    if (jingleUrl && (jingleUrl.includes('cdn.vixis.dev') || jingleUrl.includes('storage.googleapis.com'))) {
      console.log(`⚠️ La URL del jingle apunta a un recurso obsoleto: ${jingleUrl}`);
      jingleUrl = `${supabaseUrl}/storage/v1/object/public/music/Radio%20Vixis%20-%20Jingle.m4a`;
      console.log(`🔄 Redirigida URL del jingle a Supabase: ${jingleUrl}`);
    } else if (!jingleUrl && hasBucketJingle) {
      jingleUrl = `${supabaseUrl}/storage/v1/object/public/music/Radio%20Vixis%20-%20Jingle.m4a`;
      console.log(`ℹ️ Jingle auto-detectado en Supabase: ${jingleUrl}`);
    }
    
    // Filtrar el jingle de las canciones normales para evitar que se reproduzca de corrido
    const songs = audioSongs.filter(f => f.name.toLowerCase() !== 'radio vixis - jingle.m4a');
    
    if (songs.length === 0) {
      console.warn("⚠️ No se encontraron canciones para reproducir.");
    }
    
    // Mezclar (shuffle) la lista de canciones para que la radio sea dinámica
    const shuffledSongs = shuffle(songs);
    
    // Construir la playlist M3U
    const playlistLines = ["#EXTM3U"];
    let songCounter = 0;
    
    for (const song of shuffledSongs) {
      songCounter++;
      
      // Insertar jingle si está configurado
      if (jingleUrl && songCounter > 1) {
        let shouldInsert = false;
        if (jingleInterval === 1) {
          shouldInsert = true;
        } else if (songCounter === 2 || (songCounter % jingleInterval) === 1) {
          shouldInsert = true;
        }
        
        if (shouldInsert) {
          playlistLines.push("#EXTINF:-1,Radio Vixis Station ID");
          playlistLines.push(jingleUrl);
        }
      }
      
      // Construir la URL pública de la canción
      const songPath = song.name.split('/').map(encodeURIComponent).join('/');
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/music/${songPath}`;
      const title = path.basename(song.name, path.extname(song.name));
      
      playlistLines.push(`#EXTINF:-1,${title}`);
      playlistLines.push(publicUrl);
    }
    
    // Escribir archivo M3U
    const playlistContent = playlistLines.join("\n") + "\n";
    fs.writeFileSync(PLAYLIST_FILE, playlistContent, 'utf-8');
    
    const totalEntries = playlistLines.filter(line => line.startsWith('#EXTINF')).length;
    const jingleCount = jingleUrl ? Math.max(0, totalEntries - songs.length) : 0;
    
    console.log(`✅ Playlist M3U generada con éxito en ${PLAYLIST_FILE}`);
    console.log(`📋 Canciones: ${songs.length} | Jingles: ${jingleCount} | Total entradas: ${totalEntries}`);
    
  } catch (error) {
    console.error("❌ ERROR al actualizar la playlist:", error.message);
    process.exit(1);
  }
}

main();
