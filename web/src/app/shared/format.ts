import { Pipe, PipeTransform } from '@angular/core';

const money = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** 4500 → « 4 500 FCFA » */
export function formatFcfa(value: number | null | undefined): string {
  return `${money.format(value ?? 0).replace(/ | /g, ' ')} FCFA`;
}

/** Durée écoulée lisible : « à l'instant », « il y a 12 min », « il y a 3 h », « il y a 2 j ». */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.floor(hours / 24)} j`;
}

@Pipe({ name: 'fcfa', standalone: true })
export class FcfaPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatFcfa(value);
  }
}

@Pipe({ name: 'timeAgo', standalone: true, pure: false })
export class TimeAgoPipe implements PipeTransform {
  transform(iso: string): string {
    return timeAgo(iso);
  }
}
