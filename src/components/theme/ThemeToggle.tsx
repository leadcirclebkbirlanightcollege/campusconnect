 import { Moon, Sun } from "lucide-react";
 import { useEffect, useState } from "react";
 import { Button } from "@/components/ui/button";
 
 type Theme = "light" | "dark";
 
 export function ThemeToggle({ compact = false }: { compact?: boolean }) {
   const [theme, setTheme] = useState<Theme>(() => {
     const stored = localStorage.getItem("theme") as Theme | null;
     if (stored) return stored;
     return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
   });
 
   useEffect(() => {
     const root = document.documentElement;
     root.classList.remove("light", "dark");
     root.classList.add(theme);
     localStorage.setItem("theme", theme);
   }, [theme]);
 
   const toggleTheme = () => {
     setTheme((prev) => (prev === "dark" ? "light" : "dark"));
   };
 
   if (compact) {
     return (
       <Button
         variant="ghost"
         size="icon"
         onClick={toggleTheme}
         className="h-9 w-9"
         aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
       >
         {theme === "dark" ? (
           <Sun className="h-5 w-5 transition-transform duration-300 rotate-0 scale-100" />
         ) : (
           <Moon className="h-5 w-5 transition-transform duration-300 rotate-0 scale-100" />
         )}
       </Button>
     );
   }
 
   return (
     <Button
       variant="ghost"
       onClick={toggleTheme}
       className="w-full justify-start gap-3 h-auto py-2"
       aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
     >
       {theme === "dark" ? (
         <>
           <Sun className="h-5 w-5 transition-all duration-300" />
           <span className="group-data-[collapsible=icon]:hidden">Light Mode</span>
         </>
       ) : (
         <>
           <Moon className="h-5 w-5 transition-all duration-300" />
           <span className="group-data-[collapsible=icon]:hidden">Dark Mode</span>
         </>
       )}
     </Button>
   );
 }