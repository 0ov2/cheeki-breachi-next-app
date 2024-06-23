import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url);
      const playerName = searchParams.get('playerName');
      
      if (!playerName) {
        return NextResponse.json({ error: 'Player name is required' }, { status: 400 });
      }
  
      const url = `https://breacherstracker.com/api/players/search/${playerName}`;
      console.log(`Proxying request to: ${url}`);
  
      const requestResponse = await fetch(url);
      
      if (!requestResponse.ok) {
        console.error('Failed to fetch data:', requestResponse.statusText);
        return NextResponse.json({ error: requestResponse.statusText }, { status: requestResponse.status });
      }
  
      const data = await requestResponse.json();
      console.log(data);
  
      return NextResponse.json(data, { status: 200 });
    } catch (error) {
      console.error('Error fetching data:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }
