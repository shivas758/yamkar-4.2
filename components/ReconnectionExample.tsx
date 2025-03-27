"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useReconnection } from '@/hooks/useReconnection';
import { useReconnectionContext } from '@/contexts/ReconnectionContext';
import { useAuth } from '@/contexts/auth-context';

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get authentication state
  const { user, isLoading: authLoading } = useAuth();
  
  // Get the reconnection context for UI indicators
  const { isReconnecting, lastReconnection } = useReconnectionContext();
  
  // Define data fetching function
  const fetchTodos = useCallback(async () => {
    // Don't fetch if not authenticated
    if (!user) {
      setTodos([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching todos...');
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setTodos(data || []);
      console.log('Todos fetched successfully:', data?.length || 0);
    } catch (err: any) {
      console.error('Error fetching todos:', err);
      setError(err.message || 'An error occurred while fetching todos');
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  // Initial data fetch - only when authenticated and not loading
  useEffect(() => {
    if (user && !authLoading) {
      fetchTodos();
    }
  }, [fetchTodos, user, authLoading]);
  
  // Set up reconnection handler
  useReconnection(fetchTodos);
  
  // Set up realtime subscription
  useEffect(() => {
    // Don't set up subscription if not authenticated
    if (!user) return;
    
    console.log('Setting up realtime subscription');
    
    // Set up realtime subscription for todos table
    const subscription = supabase
      .channel('todos-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'todos' },
        (payload) => {
          console.log('Realtime update received:', payload);
          
          // Handle different types of changes
          if (payload.eventType === 'INSERT') {
            setTodos(prev => [payload.new as Todo, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTodos(prev => prev.map(todo => 
              todo.id === payload.new.id ? payload.new as Todo : todo
            ));
          } else if (payload.eventType === 'DELETE') {
            setTodos(prev => prev.filter(todo => todo.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });
    
    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [user]);
  
  // If not authenticated, don't show the component
  if (!user) {
    return null;
  }
  
  return (
    <div className="todo-list">
      <div className="todo-list-header">
        <h2>Todo List</h2>
        <button onClick={fetchTodos} disabled={isLoading}>
          Refresh
        </button>
      </div>
      
      {/* Show reconnection status */}
      {isReconnecting && (
        <div className="reconnecting-indicator">
          Reconnecting to server...
        </div>
      )}
      
      {lastReconnection && (
        <div className="last-reconnection">
          Last reconnected: {lastReconnection.toLocaleTimeString()}
        </div>
      )}
      
      {/* Show error if any */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading ? (
        <div className="loading-indicator">
          Loading todos...
        </div>
      ) : (
        /* Todo list */
        <ul className="todos">
          {todos.length === 0 ? (
            <li className="empty-state">No todos found</li>
          ) : (
            todos.map((todo) => (
              <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                <span className="todo-title">{todo.title}</span>
                <span className="todo-date">
                  {new Date(todo.created_at).toLocaleDateString()}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
} 