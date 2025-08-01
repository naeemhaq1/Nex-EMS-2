import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Terminal, Send, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CommandHistory {
  command: string;
  output: string;
  timestamp: Date;
  success: boolean;
}

export default function ShellTerminal() {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<CommandHistory[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Add welcome message
    setHistory([
      {
        command: 'welcome',
        output: 'Nexlinx EMS Shell Terminal v1.0.0\nType commands to interact with the system.\nUse "help" for available commands.',
        timestamp: new Date(),
        success: true,
      },
    ]);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new content is added
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const executeCommand = async () => {
    if (!command.trim() || isExecuting) return;

    const currentCommand = command.trim();
    setCommand('');
    setIsExecuting(true);

    // Add to command history
    setCommandHistory(prev => [...prev, currentCommand]);
    setHistoryIndex(-1);

    // Add command to display history
    const newEntry: CommandHistory = {
      command: currentCommand,
      output: '',
      timestamp: new Date(),
      success: false,
    };

    setHistory(prev => [...prev, newEntry]);

    try {
      // Handle local commands
      if (currentCommand === 'clear') {
        setHistory([]);
        setIsExecuting(false);
        return;
      }

      if (currentCommand === 'help') {
        const helpText = `Available Commands:
• help - Show this help message
• clear - Clear terminal screen
• pwd - Show current directory
• ls - List directory contents
• whoami - Show current user
• date - Show current date/time
• ps - Show running processes
• df - Show disk usage
• free - Show memory usage
• uptime - Show system uptime
• cat [file] - Display file contents
• echo [text] - Display text
• ping [host] - Ping a host
• curl [url] - Make HTTP request
• npm [command] - Run npm commands
• node [file] - Run Node.js files
• git [command] - Run git commands`;

        setHistory(prev => prev.map((item, index) => 
          index === prev.length - 1 
            ? { ...item, output: helpText, success: true }
            : item
        ));
        setIsExecuting(false);
        return;
      }

      // Execute command on server
      const response = await apiRequest('/api/shell/execute', {
        method: 'POST',
        body: JSON.stringify({ command: currentCommand }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setHistory(prev => prev.map((item, index) => 
          index === prev.length - 1 
            ? { ...item, output: result.output, success: result.success }
            : item
        ));
      } else {
        const error = await response.json();
        setHistory(prev => prev.map((item, index) => 
          index === prev.length - 1 
            ? { ...item, output: `Error: ${error.error}`, success: false }
            : item
        ));
      }

    } catch (error) {
      setHistory(prev => prev.map((item, index) => 
        index === prev.length - 1 
          ? { ...item, output: `Error: ${error.message}`, success: false }
          : item
      ));
      
      toast({
        title: "Command Error",
        description: `Failed to execute command: ${error.message}`,
        variant: "destructive",
      });
    }

    setIsExecuting(false);
  };

  const navigateHistory = (direction: 'up' | 'down') => {
    if (direction === 'up' && historyIndex < commandHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
    } else if (direction === 'down' && historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCommand(commandHistory[commandHistory.length - 1 - newIndex]);
    } else if (direction === 'down' && historyIndex === 0) {
      setHistoryIndex(-1);
      setCommand('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateHistory('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateHistory('down');
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString();
  };

  const clearTerminal = () => {
    setHistory([]);
    setCommand('');
    setHistoryIndex(-1);
  };

  return (
    <div className="min-h-screen bg-[#1A1B3E] p-6">
      <Card className="h-[calc(100vh-3rem)] bg-[#0A0A0A] border-gray-700">
        <CardHeader className="bg-[#1A1A1A] border-b border-gray-700">
          <CardTitle className="flex items-center gap-2 text-green-400">
            <Terminal className="w-5 h-5" />
            Shell Terminal
            <Badge variant="secondary" className="ml-auto">
              Connected
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="h-[calc(100%-5rem)] p-0 flex flex-col">
          {/* Terminal Output */}
          <div
            ref={terminalRef}
            className="flex-1 p-4 overflow-y-auto bg-[#0A0A0A] font-mono text-sm text-white"
          >
            {history.map((entry, index) => (
              <div key={index} className="mb-4">
                {entry.command !== 'welcome' && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-400">$</span>
                    <span className="text-white">{entry.command}</span>
                    <span className="text-gray-500 text-xs ml-auto">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>
                )}
                <pre
                  className={`whitespace-pre-wrap ${
                    entry.success ? 'text-white' : 'text-red-400'
                  }`}
                >
                  {entry.output}
                </pre>
              </div>
            ))}
            
            {isExecuting && (
              <div className="flex items-center gap-2 text-green-400">
                <span>$</span>
                <span>Executing...</span>
              </div>
            )}
          </div>

          {/* Command Input */}
          <div className="bg-[#1A1A1A] border-t border-gray-700 p-4">
            <div className="flex items-center gap-2">
              <span className="text-green-400 font-mono">$</span>
              <Input
                ref={inputRef}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter command..."
                className="flex-1 bg-[#0A0A0A] border-gray-600 text-white font-mono"
                disabled={isExecuting}
              />
              
              <Button
                onClick={() => navigateHistory('up')}
                variant="outline"
                size="sm"
                className="bg-[#2A2A2A] border-gray-600 text-white hover:bg-[#3A3A3A]"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={() => navigateHistory('down')}
                variant="outline"
                size="sm"
                className="bg-[#2A2A2A] border-gray-600 text-white hover:bg-[#3A3A3A]"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={clearTerminal}
                variant="outline"
                size="sm"
                className="bg-[#2A2A2A] border-gray-600 text-white hover:bg-[#3A3A3A]"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={executeCommand}
                disabled={!command.trim() || isExecuting}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}