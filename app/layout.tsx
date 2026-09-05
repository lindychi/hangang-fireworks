import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'한강, 우리 둘 — 오늘은 여기가 명당',description:'그날 다 못 본 하늘을, 오늘은 마음껏. 좋아하는 음악에 맞춰 한강 밤하늘에 펼쳐지는 우리만의 불꽃축제.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="ko"><body>{children}</body></html>;}
