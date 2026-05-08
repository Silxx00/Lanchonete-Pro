import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0f]">
      <div className="text-center space-y-6 px-4">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-blue-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-white">404</h1>
          <p className="text-xl font-semibold text-gray-300">Página não encontrada</p>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            A página que você está procurando não existe ou foi movida.
          </p>
        </div>

        <Link href="/">
          <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            Voltar ao início
          </button>
        </Link>
      </div>
    </div>
  );
}
