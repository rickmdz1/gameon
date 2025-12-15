import React from 'react';
import { Player } from '../types';
import { LogIn, LogOut, User } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface HeaderProps {
  user: Player | null;
  onSignInClick?: () => void;
  onProfileClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onSignInClick, onProfileClick }) => {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="w-full py-6 px-8 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10">
      <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight">GAME ON!</h1>
      
      <div className="flex items-center gap-4">
        {user ? (
             <div className="flex items-center gap-4">
                 <button 
                    onClick={onProfileClick}
                    className="flex items-center gap-3 bg-white px-2 py-1.5 pr-4 rounded-full shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
                 >
                    <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center overflow-hidden">
                        {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                                <span className="font-bold text-xs">{user.name.charAt(0)}</span>
                        )}
                    </div>
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-900 hidden sm:block">{user.name}</span>
                </button>
                
                <button 
                    onClick={handleSignOut}
                    className="p-2 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full border border-slate-100 transition-colors"
                    title="Sign Out"
                >
                    <LogOut className="w-5 h-5" />
                </button>
             </div>
        ) : (
            <button 
                onClick={onSignInClick}
                className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95"
            >
                <LogIn className="w-4 h-4" />
                Sign In
            </button>
        )}
      </div>
    </header>
  );
};

export default Header;