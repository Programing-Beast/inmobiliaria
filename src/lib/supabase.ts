// Re-export everything from turso.ts for backward compatibility
// This file now uses Turso/LibSQL instead of Supabase

export * from './turso';

// Import functions directly for backward compatibility
import {
  db,
  signUp as tursoSignUp,
  signIn as tursoSignIn,
  signOut as tursoSignOut,
  getCurrentUser,
  sendPasswordResetEmail
} from './turso';

// For backward compatibility with code that imports 'supabase' client
// Note: This is a different API than the Supabase client
export const supabase = {
  auth: {
    getSession: async () => {
      const userId = localStorage.getItem('currentUserId');
      if (!userId) {
        return { data: { session: null }, error: null };
      }
      return {
        data: {
          session: {
            user: { id: userId, email: localStorage.getItem('currentUserEmail') }
          }
        },
        error: null
      };
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Check initial state
      const userId = localStorage.getItem('currentUserId');
      if (userId) {
        callback('SIGNED_IN', {
          user: { id: userId, email: localStorage.getItem('currentUserEmail') }
        });
      }

      // Listen for storage changes (for multi-tab support)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'currentUserId') {
          if (e.newValue) {
            callback('SIGNED_IN', {
              user: { id: e.newValue, email: localStorage.getItem('currentUserEmail') }
            });
          } else {
            callback('SIGNED_OUT', null);
          }
        }
      };

      window.addEventListener('storage', handleStorageChange);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              window.removeEventListener('storage', handleStorageChange);
            }
          }
        }
      };
    },
    signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
      return tursoSignUp(email, password, options?.data?.full_name || '');
    },
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      return tursoSignIn(email, password);
    },
    signOut: async () => {
      return tursoSignOut();
    },
    getUser: async () => {
      return getCurrentUser();
    },
    resetPasswordForEmail: async (email: string, options?: any) => {
      return sendPasswordResetEmail(email);
    }
  },
  from: (table: string) => {
    // Basic query builder for backward compatibility
    // This is a simplified implementation
    return {
      select: (columns: string = '*') => ({
        eq: (column: string, value: any) => ({
          single: async () => {
            const result = await db.execute({
              sql: `SELECT ${columns} FROM ${table} WHERE ${column} = ? LIMIT 1`,
              args: [value]
            });
            if (result.rows.length === 0) {
              return { data: null, error: null };
            }
            const data: Record<string, unknown> = {};
            result.columns.forEach((col, idx) => {
              data[col] = result.rows[0][idx];
            });
            return { data, error: null };
          },
          maybeSingle: async () => {
            const result = await db.execute({
              sql: `SELECT ${columns} FROM ${table} WHERE ${column} = ? LIMIT 1`,
              args: [value]
            });
            if (result.rows.length === 0) {
              return { data: null, error: null };
            }
            const data: Record<string, unknown> = {};
            result.columns.forEach((col, idx) => {
              data[col] = result.rows[0][idx];
            });
            return { data, error: null };
          },
          order: (orderCol: string, options?: { ascending?: boolean }) => ({
            then: async (resolve: Function) => {
              const order = options?.ascending === false ? 'DESC' : 'ASC';
              const result = await db.execute({
                sql: `SELECT ${columns} FROM ${table} WHERE ${column} = ? ORDER BY ${orderCol} ${order}`,
                args: [value]
              });
              const data = result.rows.map(row => {
                const obj: Record<string, unknown> = {};
                result.columns.forEach((col, idx) => {
                  obj[col] = row[idx];
                });
                return obj;
              });
              resolve({ data, error: null });
            }
          })
        }),
        order: (column: string, options?: { ascending?: boolean }) => ({
          then: async (resolve: Function) => {
            const order = options?.ascending === false ? 'DESC' : 'ASC';
            const result = await db.execute({
              sql: `SELECT ${columns} FROM ${table} ORDER BY ${column} ${order}`,
              args: []
            });
            const data = result.rows.map(row => {
              const obj: Record<string, unknown> = {};
              result.columns.forEach((col, idx) => {
                obj[col] = row[idx];
              });
              return obj;
            });
            resolve({ data, error: null });
          }
        })
      }),
      insert: (data: any) => ({
        select: (columns: string = '*') => ({
          single: async () => {
            // This is a simplified implementation
            return { data: null, error: { message: 'Use turso.ts functions directly' } };
          }
        })
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: (columns: string = '*') => ({
            single: async () => {
              return { data: null, error: { message: 'Use turso.ts functions directly' } };
            }
          })
        })
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          then: async (resolve: Function) => {
            await db.execute({
              sql: `DELETE FROM ${table} WHERE ${column} = ?`,
              args: [value]
            });
            resolve({ error: null });
          }
        })
      })
    };
  },
  rpc: async (fnName: string, params: any) => {
    // RPC functions need to be implemented as regular queries
    console.warn(`RPC function ${fnName} called - these are implemented in turso.ts`);
    return { data: null, error: { message: 'Use turso.ts functions directly' } };
  },
  channel: (name: string) => ({
    on: (event: string, config: any, callback: Function) => ({
      subscribe: () => {
        console.warn('Real-time subscriptions are not supported with Turso');
        return { unsubscribe: () => {} };
      }
    })
  }),
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File, options?: any) => {
        console.warn('File storage is not supported with Turso');
        return { data: null, error: { message: 'File storage not available' } };
      },
      getPublicUrl: (path: string) => {
        console.warn('File storage is not supported with Turso');
        return { data: { publicUrl: '' } };
      },
      remove: async (paths: string[]) => {
        console.warn('File storage is not supported with Turso');
        return { data: null, error: { message: 'File storage not available' } };
      }
    })
  }
};
