import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Ambil dari sessionKey (milik Reports), atau serviceType (milik Counter)
  // Jika dipanggil counter tanpa tanggal, ia akan otomatis mencari session hari ini
  const todayStr = new Date().toISOString().split('T')[0];
  const sessionKey = searchParams.get('sessionKey') || `${searchParams.get('serviceType') || 'teen'}_${todayStr}`;
  
  try {
    const docRef = doc(db, "temporary_altar_calls", sessionKey);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const rawAltarCalls = docSnap.data().altarCalls || [];
      
      const formattedForCounter = rawAltarCalls.map((ac: any, index: number) => ({
        id: index + 1,
        name: ac.text.trim() !== "" ? ac.text : `Altar Call ${index + 1}`
      }));
      
      return NextResponse.json(formattedForCounter);
    } else {
      return NextResponse.json([{ id: 1, name: 'Altar Call 1' }]);
    }
  } catch (error) {
    console.error("Firebase GET Error:", error);
    return NextResponse.json({ error: 'Gagal memuat' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionKey, altarCalls } = body;

    if (!sessionKey || !altarCalls) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const docRef = doc(db, "temporary_altar_calls", sessionKey);
    await setDoc(docRef, { 
      altarCalls, 
      updatedAt: new Date().toISOString() 
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Firebase POST Error:", error);
    return NextResponse.json({ error: 'Gagal menyimpan' }, { status: 500 });
  }
}