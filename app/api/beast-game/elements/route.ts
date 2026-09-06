import { NextResponse } from 'next/server';
import { elementGuide } from '@/lib/beast-game/element-lesson';
export function GET(){return NextResponse.json(elementGuide());}
