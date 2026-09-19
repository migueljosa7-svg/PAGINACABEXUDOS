/**
 * GPS Live status context for Sprint 1 (estabilidad en calle y feedback visual).
 *
 * Deriva estados semánticos de usuarios a partir de la señal cruda del
 * WebSocket / emisores, para que la UI exporte textos accesibles y badges
 * con significado, no strings arbitrarios.
 */

import { useMemo } from 'react';
import type { GpsLiveConnectionStatus, GpsLiveSenderStatus, GpsLiveStatusContext } from '../services/gpsStatus';
import {
  classifyLiveSignalFromAge,
  gpsStatusSentence,
  isMarkerPulseActive,
  signalAgeSeconds,
} from '../services/gpsStatus';

export interface UseGpsLiveStatusOptions {
  wsConnected: boolean;
  connectionInfo: string;
  senderPositions: Array<{ senderId: string; label: string; lat: number; lng: number; accuracy?: number | null; lastSeen: number }>;
  isSimulated?: boolean;
}

export function useGpsLiveStatusContext(options: UseGpsLiveStatusOptions): GpsLiveStatusContext {
  const { wsConnected, connectionInfo, senderPositions, isSimulated = false } = options;

  const now = Date.now();

  const globalStatus = useMemo<GpsLiveConnectionStatus>(() => {
    if (isSimulated) {
      return { kind: 'simulacion', ageMs: 0 };
    }

    if (!wsConnected) {
      return { kind: 'desconectado' };
    }

    const livePositions = senderPositions.filter((p) => now - p.lastSeen < 15000);
    if (livePositions.length === 0) {
      return { kind: 'buscando' };
    }

    const freshest = livePositions.reduce((best, p) => (p.lastSeen > best.lastSeen ? p : best));
    const ageMs = now - freshest.lastSeen;
    return { kind: classifyLiveSignalFromAge(ageMs, 20000), ageMs, accuracy: freshest.accuracy ?? null };
  }, [wsConnected, connectionInfo, senderPositions, isSimulated, now]);

  const sendersByStatus = useMemo(() => {
    const map = new Map<string, GpsLiveSenderStatus>();
    for (const p of senderPositions) {
      const ageMs = now - p.lastSeen;
      const kind = classifyLiveSignalFromAge(ageMs, 20000);
      map.set(p.senderId, { status: { kind, ageMs, accuracy: p.accuracy ?? null }, ageSec: signalAgeSeconds(p.lastSeen) });
    }
    return map;
  }, [senderPositions, now]);

  const followStatus: GpsLiveSenderStatus =
    senderPositions.length > 0
      ? (sendersByStatus.get(senderPositions[0]?.senderId ?? '') ?? { status: globalStatus, ageSec: 0 })
      : { status: globalStatus, ageSec: 0 };

  const followAgeMs = typeof followStatus.status.ageMs === 'number' ? followStatus.status.ageMs : 0;

  return {
    status: globalStatus,
    lastSeenAt: now - followAgeMs,
    isSimulated,
    liveSenderCount: senderPositions.filter((p) => now - p.lastSeen < 15000).length,
    sentence: gpsStatusSentence(globalStatus, { includeAge: true, includeAccuracy: true }),
    sendersByStatus,
  };
}

export function senderPulseActive(senderId: string, ctx: GpsLiveStatusContext): boolean {
  const bySender = ctx.sendersByStatus.get(senderId);
  if (!bySender) return false;
  return isMarkerPulseActive(bySender.status.kind);
}

