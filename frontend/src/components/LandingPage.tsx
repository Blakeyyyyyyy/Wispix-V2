import { useState } from 'react';
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  ArrowRight, 
  Sparkles, 
  Bot, 
  Users, 
  Zap, 
  Menu,
  X,
  Brain,
  MessageSquare,
  Calculator,
  FileText,
  ShoppingCart,
  Headphones,
  BarChart3,
  Mail
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: (request: string) => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [input, setInput] = useState('');

  const navigationItems = [
    { name: 'Community', href: '#' },
    { name: 'Pricing', href: '#' },
    { name: 'Enterprise', href: '#' },
    { name: 'Learn', href: '#' },
    { name: 'Launched', href: '#' },
  ];

  const suggestions = [
    { icon: Headphones, text: 'Customer support agent', color: 'from-blue-500 to-cyan-500' },
    { icon: BarChart3, text: 'Data analyst assistant', color: 'from-purple-500 to-pink-500' },
    { icon: ShoppingCart, text: 'E-commerce manager', color: 'from-green-500 to-emerald-500' },
    { icon: Mail, text: 'Email marketing specialist', color: 'from-orange-500 to-red-500' },
    { icon: FileText, text: 'Content writer', color: 'from-indigo-500 to-purple-500' },
    { icon: Calculator, text: 'Financial advisor', color: 'from-teal-500 to-cyan-500' },
  ];

  const handleSuggestionClick = (text: string) => {
    setInput(text);
  };

  const handleSubmit = () => {
    if (input.trim()) {
      onGetStarted(input.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Navigation */}
      <nav className="relative z-50 px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl">Wispix AI</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navigationItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-gray-300 hover:text-white transition-colors text-sm"
                >
                  {item.name}
                </a>
              ))}
            </div>

            {/* User Profile */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
                <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">U</span>
                </div>
                <span className="text-sm">User's Wispix</span>
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg bg-white/10 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 p-4 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
              <div className="flex flex-col gap-4">
                {navigationItems.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="text-gray-300 hover:text-white transition-colors text-sm"
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-5xl mx-auto text-center">
          {/* Hero Text */}
          <div className="mb-16">
            <h1 className="text-5xl md:text-7xl mb-6 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent leading-tight">
              Type a task.{' '}
              <span className="relative block mt-2">
                <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
                  Wispix builds your AI employee.
                </span>
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
              Create specialized AI agents that work 24/7 to handle tasks, answer questions, and grow your business
            </p>
          </div>

          {/* Large Input Section */}
          <div className="mb-12">
            <div className="relative max-w-4xl mx-auto">
              <div className="relative">
                <textarea
                  placeholder="I need an AI employee that can handle customer support tickets, answer product questions, and escalate complex issues to human agents..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
                  className="w-full px-8 py-8 text-lg bg-black/40 backdrop-blur-sm border border-white/20 rounded-3xl placeholder:text-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 transition-all resize-none min-h-[120px]"
                  rows={4}
                />
                <div className="absolute right-4 bottom-4">
                  <Button
                    onClick={handleSubmit}
                    disabled={!input.trim()}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-8 py-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Build Employee
                  </Button>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center gap-6 mt-6 text-sm text-gray-400 justify-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>24/7 Operation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-cyan-400" />
                  <span>AI Powered</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span>Instant Deploy</span>
                </div>
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <div className="mb-20">
            <p className="text-gray-400 mb-6">Popular AI employees:</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {suggestions.map((suggestion, index) => {
                const IconComponent = suggestion.icon;
                return (
                  <Button
                    key={index}
                    variant="ghost"
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-gray-700 transition-all"
                  >
                    <div className={`w-4 h-4 mr-3 bg-gradient-to-r ${suggestion.color} rounded-full flex items-center justify-center`}>
                      <IconComponent className="w-2.5 h-2.5 text-white" />
                    </div>
                    {suggestion.text}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl mb-4">Intelligent AI Agents</h3>
              <p className="text-gray-400">
                Create specialized AI employees trained for specific roles and tasks in your business
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl mb-4">Natural Conversations</h3>
              <p className="text-gray-400">
                AI employees that communicate naturally with customers, colleagues, and systems
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl mb-4">Team Integration</h3>
              <p className="text-gray-400">
                Seamlessly integrate AI employees into your existing workflows and team structure
              </p>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-20 p-8 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-600/10 backdrop-blur-sm border border-cyan-400/20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl mb-2 bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">10,000+</div>
                <div className="text-gray-400">AI Employees Created</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2 bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">24/7</div>
                <div className="text-gray-400">Always Working</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2 bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">95%</div>
                <div className="text-gray-400">Task Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2 bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">50+</div>
                <div className="text-gray-400">Employee Types</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="text-gray-400">© 2025 Wispix AI</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
