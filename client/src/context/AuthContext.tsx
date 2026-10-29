import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, AuthState, SchoolInfo } from '../types/auth';
import { DEMO_USERS, PREVIEW_SCHOOL } from '../data/previewData';
import { api } from '../lib/api';

interface AuthContextType extends AuthState {
  login: (email: string, password?: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  activeRole: UserRole;
  schoolName: string;
  school: SchoolInfo | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const savedRole = (localStorage.getItem('edumanage_role') as UserRole) || 'admin';
  const savedSchoolId = localStorage.getItem('edumanage_school_id') || PREVIEW_SCHOOL.id;

  const defaultSchool: SchoolInfo = {
    id: savedSchoolId,
    name: PREVIEW_SCHOOL.name,
    code: PREVIEW_SCHOOL.code,
    currency: PREVIEW_SCHOOL.currency || 'USD',
    timezone: 'UTC',
    academicYear: PREVIEW_SCHOOL.academicYear || '2026 - 2027',
    logo: PREVIEW_SCHOOL.logo,
  };

  const [activeRole, setActiveRole] = useState<UserRole>(savedRole);
  const [user, setUser] = useState<User | null>(DEMO_USERS[savedRole] || DEMO_USERS.admin);
  const [token, setToken] = useState<string | null>(localStorage.getItem('edumanage_token'));
  const [schoolId, setSchoolId] = useState<string>(savedSchoolId);
  const [schoolName, setSchoolName] = useState<string>(PREVIEW_SCHOOL.name);
  const [school, setSchool] = useState<SchoolInfo | null>(defaultSchool);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore session from /api/v1/auth/me on mount
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const response = await api.get<{
          user: User;
          school?: SchoolInfo;
          permissions: string[];
        }>('/auth/me');

        if (isMounted && response?.data?.user) {
          const authUser = response.data.user;
          setUser(authUser);
          setActiveRole(authUser.role);
          if (response.data.school) {
            const s = response.data.school;
            setSchoolId(s.id);
            setSchoolName(s.name);
            setSchool({
              id: s.id,
              name: s.name,
              code: s.code || PREVIEW_SCHOOL.code,
              currency: s.currency || 'USD',
              timezone: s.timezone || 'UTC',
              academicYear: s.academicYear || PREVIEW_SCHOOL.academicYear,
              logo: s.logo || PREVIEW_SCHOOL.logo,
              status: s.status,
            });
            localStorage.setItem('edumanage_school_id', s.id);
          }
          if (response.data.permissions) {
            setPermissions(response.data.permissions);
          }
          localStorage.setItem('edumanage_role', authUser.role);
        }
      } catch {
        // Fall back to preview user if unauthenticated or offline
        if (isMounted) {
          const fallbackUser = DEMO_USERS[savedRole] || DEMO_USERS.admin;
          setUser(fallbackUser);
          setActiveRole(savedRole);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const switchRole = (newRole: UserRole) => {
    setIsLoading(true);
    setActiveRole(newRole);
    setUser(DEMO_USERS[newRole] || null);
    localStorage.setItem('edumanage_role', newRole);
    setTimeout(() => {
      setIsLoading(false);
    }, 150);
  };

  const login = async (email: string, passwordOrRole?: string, _roleParam?: UserRole) => {
    setIsLoading(true);

    const validRoles: UserRole[] = ['super_admin', 'admin', 'teacher', 'student', 'parent'];
    let password = 'password123';

    if (passwordOrRole && !validRoles.includes(passwordOrRole as UserRole)) {
      password = passwordOrRole;
    }

    try {
      const response = await api.post<{
        tokens: { accessToken: string };
        user: User;
        school?: { id: string; name: string };
        permissions?: string[];
      }>('/auth/login', {
        email,
        password,
      });

      if (response.data?.tokens?.accessToken) {
        setToken(response.data.tokens.accessToken);
        localStorage.setItem('edumanage_token', response.data.tokens.accessToken);
      }

      if (response.data?.user) {
        const loggedInUser = response.data.user;
        setUser(loggedInUser);
        setActiveRole(loggedInUser.role);
        localStorage.setItem('edumanage_role', loggedInUser.role);

        if (response.data.school) {
          const s = response.data.school as SchoolInfo;
          setSchoolId(s.id);
          setSchoolName(s.name);
          setSchool({
            id: s.id,
            name: s.name,
            code: s.code || PREVIEW_SCHOOL.code,
            currency: s.currency || 'USD',
            timezone: s.timezone || 'UTC',
            academicYear: s.academicYear || PREVIEW_SCHOOL.academicYear,
            logo: s.logo || PREVIEW_SCHOOL.logo,
            status: s.status,
          });
          localStorage.setItem('edumanage_school_id', s.id);
        }
        if (response.data.permissions) {
          setPermissions(response.data.permissions);
        }
      }
    } catch (error) {
      // If error occurs, propagate error to let caller display user-facing alert
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Continue client cleanup even if network request fails
    } finally {
      setUser(null);
      setToken(null);
      setPermissions([]);
      setSchool(defaultSchool);
      localStorage.removeItem('edumanage_token');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        schoolId,
        activeRole,
        schoolName,
        school,
        permissions,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
