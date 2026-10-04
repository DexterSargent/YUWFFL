import { Shield, Sword, Cat, Bird, Hexagon } from 'lucide-react';

export const teamColors: Record<string, string> = {
  "York Lions": "text-[#E31837]",
  "McMaster Marauders": "text-[#7A003C]",
  "Waterloo Warriors": "text-yellow-500",
  "Ottawa Gee-Gees": "text-[#8F001A]",
  "Canadore Panthers": "text-teal-500",
  "Toronto Varsity Blues": "text-blue-900",
  "Laurier Golden Hawks": "text-purple-800",
  "Western Mustangs": "text-purple-600",
  "Guelph Gryphons": "text-red-600",
  "Queen's Gaels": "text-blue-800",
  "Carleton Ravens": "text-black"
};

export function getTeamColor(teamName: string) {
  return teamColors[teamName] || "text-blue-500";
}

export function TeamLogo({ teamName, className = "w-12 h-12" }: { teamName: string, className?: string }) {
  const color = getTeamColor(teamName);
  const iconProps = { className: `${className} ${color}` };
  
  switch(teamName) {
    case "York Lions": return <img src="https://upload.wikimedia.org/wikipedia/en/d/d6/York_Lions_logo.svg" alt="York Lions" className={className} style={{ objectFit: 'contain' }} />;
    case "McMaster Marauders": return <Bird {...iconProps} />;
    case "Waterloo Warriors": return <Sword {...iconProps} />;
    case "Ottawa Gee-Gees": return <Hexagon {...iconProps} />;
    case "Canadore Panthers": return <Cat {...iconProps} />;
    case "Toronto Varsity Blues": return <Shield {...iconProps} />;
    case "Laurier Golden Hawks": return <Bird {...iconProps} />;
    case "Western Mustangs": return <Shield {...iconProps} />;
    case "Guelph Gryphons": return <Bird {...iconProps} />;
    case "Queen's Gaels": return <Shield {...iconProps} />;
    case "Carleton Ravens": return <Bird {...iconProps} />;
    default: return <Shield {...iconProps} />;
  }
}

export const OUA_TEAMS = [
  { id: "McMaster Marauders", name: "McMaster Marauders", color: "text-[#7A003C]" },
  { id: "Waterloo Warriors", name: "Waterloo Warriors", color: "text-yellow-500" },
  { id: "Ottawa Gee-Gees", name: "Ottawa Gee-Gees", color: "text-[#8F001A]" },
  { id: "Canadore Panthers", name: "Canadore Panthers", color: "text-teal-500" },
  { id: "Toronto Varsity Blues", name: "Toronto Varsity Blues", color: "text-blue-900" },
  { id: "Laurier Golden Hawks", name: "Laurier Golden Hawks", color: "text-purple-800" },
  { id: "Western Mustangs", name: "Western Mustangs", color: "text-purple-600" },
  { id: "Guelph Gryphons", name: "Guelph Gryphons", color: "text-red-600" },
  { id: "Queen's Gaels", name: "Queen's Gaels", color: "text-blue-800" },
  { id: "Carleton Ravens", name: "Carleton Ravens", color: "text-black" },
];
