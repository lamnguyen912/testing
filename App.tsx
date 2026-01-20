
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList';
import MemberGrid from './components/MemberGrid';
import Login from './components/Login';
import TaskModal from './components/TaskModal';
import { members as initialMembers, tasks as initialTasks, releases } from './data';
import { TaskItem, MemberSummary, Release, SubTask } from './types';

enum Tab {
  DASHBOARD = 'DASHBOARD',
  TASKS = 'TASKS',
  TEAM = 'TEAM',
  LOGS = 'LOGS',
  ARCHIVE = 'ARCHIVE'
}

const navigation = [
  { id: Tab.DASHBOARD, name: 'Dashboard', icon: '📊' },
  { id: Tab.TASKS, name: 'Tasks List', icon: '📋' },
  { id: Tab.TEAM, name: 'Team Overview', icon: '👥' },
  { id: Tab.LOGS, name: 'Personal Logs', icon: '📝' },
  { id: Tab.ARCHIVE, name: 'System Settings', icon: '⚙️' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [activeRelease, setActiveRelease] = useState<Release>(releases[0]);
  
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('tnd_current_user');
  });

  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('tnd_tasks');
    return saved ? JSON.parse(saved) : initialTasks;
  });

  const [members, setMembers] = useState<MemberSummary[]>(() => {
    const saved = localStorage.getItem('tnd_members');
    return saved ? JSON.parse(saved) : initialMembers;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | undefined>(undefined);
  const [editingContextMember, setEditingContextMember] = useState<string | undefined>(undefined);

  useEffect(() => {
    localStorage.setItem('tnd_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('tnd_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('tnd_current_user', currentUser);
    } else {
      localStorage.removeItem('tnd_current_user');
    }
  }, [currentUser]);

  const SPECIAL_DAILY_TASKS = [
    'Daily Manual Smoke Test for Release',
    'Daily Failure Fixing',
    'Hardening on PatchDev'
  ];

  const isSpecialTask = (summary: string) => {
    if (!summary) return false;
    const s = summary.toLowerCase();
    return SPECIAL_DAILY_TASKS.some(k => s.includes(k.toLowerCase()));
  };

  const computeHrs = (val: any, notes: string): number => {
    const num = parseFloat(String(val || '').replace(',', '.'));
    if (!isNaN(num) && num !== 0) return num;
    
    const matches = String(notes || '').match(/(\d+(?:[.,]\d+)?)\s*(h|hr|hrs|hour|hours)\b/gi);
    if (!matches) return 0;
    return matches.reduce((sum, m) => sum + (parseFloat(m.replace(',', '.')) || 0), 0);
  };

  const getDynamicMembers = (): MemberSummary[] => {
    return members.map(m => {
      let totalLOE_Hrs = 0;
      let totalDone_Hrs = 0;
      let uniqueTickets = new Set<string>();

      tasks.forEach(t => {
        const special = isSpecialTask(t.summary);

        // 1. Check Main Row
        if (t.owner === m.member) {
          // Đối với dashboard, LOE của daily task được tính dựa trên loeHrs đã được sync từ subtasks
          const val = t.loeHrs;
          totalLOE_Hrs += val;
          if (t.status === 'Done') totalDone_Hrs += val;
          if (!special) uniqueTickets.add(t.id);
        }

        // 2. Check Subtasks
        (t.subtasks || []).forEach(st => {
          if (st.owner === m.member) {
            // Nếu là special task, subtask đóng góp vào tổng LOE của member
            const val = st.loeHrs;
            totalLOE_Hrs += val;
            if (st.status === 'Done') totalDone_Hrs += val;
            if (!special) uniqueTickets.add(t.id);
          }
        });
      });

      return {
        ...m,
        tickets: uniqueTickets.size,
        loeDays: totalLOE_Hrs / 8,
        loeDoneDays: totalDone_Hrs / 8,
        loeRemainingDays: Math.max(0, (totalLOE_Hrs - totalDone_Hrs) / 8),
      };
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const bstr = event.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      const importedTasks: TaskItem[] = [];
      const updatedMembers = [...members];
      let currentParent: TaskItem | null = null;
      let parsingTasks = false;
      let parsingMembers = false;
      
      let colMap: Record<string, number> = {};
      const norm = (s: any) => String(s || '').toLowerCase().replace(/[\r\n\t\s()]/g, '').trim();

      data.forEach((row) => {
        if (!row || row.length === 0) return;
        const rowStr = row.map(c => norm(c)).join('|');
        
        if (rowStr.includes('maxcapacity')) {
          parsingMembers = true;
          parsingTasks = false;
          row.forEach((cell, idx) => {
            const n = norm(cell);
            if (n.includes('member') || n === 'name') colMap['member'] = idx;
            if (n.includes('maxcapacity')) colMap['capacity'] = idx;
          });
          return;
        }

        if (rowStr.includes('summary') && (rowStr.includes('type') || rowStr.includes('ticket'))) {
          parsingTasks = true;
          parsingMembers = false;
          row.forEach((cell, idx) => {
            const n = norm(cell);
            if (n === 'type') colMap['type'] = idx;
            if (n.includes('ticket')) colMap['ticket'] = idx;
            if (n === 'summary') colMap['summary'] = idx;
            if (n === 'status') colMap['status'] = idx;
            if (n === 'owner') colMap['owner'] = idx;
            if (n.includes('loe')) colMap['loe'] = idx;
            if (n.includes('actual')) colMap['actual'] = idx;
            if (n.includes('start')) colMap['start'] = idx;
            if (n === 'eta') colMap['eta'] = idx;
            if (n.includes('note')) colMap['notes'] = idx;
          });
          return;
        }

        const getV = (key: string) => {
          const idx = colMap[key];
          return idx !== undefined ? String(row[idx] || '').trim() : '';
        };

        if (parsingMembers) {
          const mName = getV('member');
          const mCap = parseFloat(getV('capacity')) || 0;
          if (mName) {
            const mIdx = updatedMembers.findIndex(m => m.member === mName);
            if (mIdx !== -1) updatedMembers[mIdx].maxCapacity = mCap;
          }
        }

        if (parsingTasks) {
          const type = getV('type');
          const ticketNo = getV('ticket');
          const summary = getV('summary');
          const status = getV('status');
          const owner = getV('owner');
          const notes = getV('notes');
          const loeRaw = getV('loe');
          const actualRaw = getV('actual');

          if (!summary || summary.toLowerCase() === 'summary') return;

          const isMain = type !== '' || (ticketNo !== '' && ticketNo !== 'N/A');

          if (isMain) {
            const newTask: TaskItem = {
              id: Math.random().toString(36).substr(2, 9),
              releaseId: activeRelease.id,
              type: (type as any) || 'TEST',
              ticketNo: ticketNo || 'N/A',
              summary: summary,
              status: (status as any) || 'To Do',
              owner: owner,
              priority: 'Medium',
              loeHrs: computeHrs(loeRaw, notes),
              actualHrs: computeHrs(actualRaw, notes),
              startDate: getV('start'),
              eta: getV('eta'),
              notes: notes,
              subtasks: []
            };
            importedTasks.push(newTask);
            currentParent = newTask;
          } else if (currentParent) {
            const subTask: SubTask = {
              id: Math.random().toString(36).substr(2, 9),
              name: summary,
              status: (status as any) || 'Todo',
              loeHrs: computeHrs(loeRaw, notes),
              actualHrs: computeHrs(actualRaw, notes),
              startDate: getV('start'),
              eta: getV('eta'),
              notes: notes,
              owner: owner
            };
            currentParent.subtasks = [...(currentParent.subtasks || []), subTask];
          }
        }
      });

      // Post-Processing: Force Main Plan = Total Subtask Plan for specific tickets
      const finalizedTasks = importedTasks.map(t => {
        const isSpecial = isSpecialTask(t.summary);
        const subtasks = t.subtasks || [];
        
        if (isSpecial) {
          // Tính tổng LOE và Actual từ subtasks
          const totalSubLoe = subtasks.reduce((sum, st) => sum + st.loeHrs, 0);
          const totalSubActual = subtasks.reduce((sum, st) => sum + st.actualHrs, 0);
          
          return {
            ...t,
            // Theo yêu cầu: Main Plan (parent.loeHrs) = total subtask loeHrs
            loeHrs: totalSubLoe,
            actualHrs: totalSubActual
          };
        }
        
        // Logic dự phòng cho các task bình thường nhưng loeHrs cha bằng 0
        if (t.loeHrs === 0 && subtasks.length > 0) {
          return {
            ...t,
            loeHrs: subtasks.reduce((sum, st) => sum + st.loeHrs, 0),
            actualHrs: subtasks.reduce((sum, st) => sum + st.actualHrs, 0)
          };
        }
        
        return t;
      });

      setMembers(updatedMembers);
      setTasks(finalizedTasks);
      setActiveTab(Tab.DASHBOARD);
      alert('Migration successful! Main Plan of daily tasks synchronized with sub-tasks.');
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveTask = (updatedTask: Partial<TaskItem>) => {
    if (editingTask) {
      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...updatedTask } as TaskItem : t));
    } else {
      const newTask = { ...updatedTask, id: Math.random().toString(36).substr(2, 9), releaseId: activeRelease.id } as TaskItem;
      setTasks(prev => [newTask, ...prev]);
    }
    setIsModalOpen(false);
    setEditingTask(undefined);
    setEditingContextMember(undefined);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setIsModalOpen(false);
    setEditingTask(undefined);
  };

  const handleEditTask = (task: TaskItem, contextMember?: string) => {
    setEditingTask(task);
    setEditingContextMember(contextMember);
    setIsModalOpen(true);
  };

  const resetSystem = () => {
    if (window.confirm('WARNING: This will delete all local data and reset to default. Continue?')) {
      localStorage.removeItem('tnd_tasks');
      localStorage.removeItem('tnd_members');
      localStorage.removeItem('tnd_current_user');
      window.location.reload();
    }
  };

  if (!currentUser) {
    return <Login members={members} onLogin={setCurrentUser} />;
  }

  const currentDynamicMembers = getDynamicMembers();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      <aside className="w-full lg:w-72 bg-white border-r border-gray-100 p-6 flex flex-col lg:h-screen lg:fixed shadow-sm z-10">
        <div className="flex items-center space-x-3 mb-10 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl italic shadow-lg shadow-blue-100">T</div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none">TnD Pro</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Release {activeRelease.name} • Active</p>
          </div>
        </div>
        <nav className="flex-1 space-y-2">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-gray-100">
          <div className="flex items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mr-3 ring-4 ring-white shadow-sm">
              {currentUser.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-gray-900 truncate">{currentUser}</p>
              <button onClick={() => setCurrentUser(null)} className="text-[10px] text-gray-400 font-bold uppercase hover:text-red-500 transition-colors">Sign Out</button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-72 p-6 lg:p-12 max-w-7xl mx-auto w-full">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">
            {navigation.find(n => n.id === activeTab)?.name}
          </h2>
          <div className="flex items-center space-x-3">
             <button onClick={() => { setEditingTask(undefined); setEditingContextMember(undefined); setIsModalOpen(true); }} className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">+ Create Task</button>
          </div>
        </header>

        <div className="transition-all duration-300">
          {activeTab === Tab.DASHBOARD && <Dashboard members={currentDynamicMembers} activeRelease={activeRelease} tasks={tasks} />}
          {activeTab === Tab.TASKS && (
            <TaskList 
              tasks={tasks} 
              members={currentDynamicMembers} 
              onEditTask={handleEditTask} 
              currentUser={currentUser} 
            />
          )}
          {activeTab === Tab.TEAM && <MemberGrid members={currentDynamicMembers} />}
          {activeTab === Tab.LOGS && (
             <div className="space-y-6">
                {tasks.filter(t => t.owner === currentUser || t.subtasks?.some(st => st.owner === currentUser)).map(task => {
                  const isShared = !task.owner || task.owner === 'Unassigned' || task.owner === '';
                  const myPart = task.subtasks?.find(st => st.owner === currentUser);
                  return (
                    <div key={task.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between mb-4">
                        <h3 className="text-xl font-bold">{task.summary}</h3>
                        <span className="text-xs font-mono bg-gray-50 px-2 py-1 rounded">{task.ticketNo}</span>
                      </div>
                      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-sm font-mono whitespace-pre-line">
                        {isShared ? `[Your Part: ${myPart?.name || 'Involvement'}]\n${task.notes}` : task.notes || 'No logs...'}
                      </div>
                    </div>
                  );
                })}
             </div>
          )}
          {activeTab === Tab.ARCHIVE && (
             <div className="space-y-12">
               <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm text-center">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">📂</div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Excel Migration</h3>
                  <p className="text-gray-400 max-w-md mx-auto mb-8">Tải lên file .xlsx từ Google Sheets. Ứng dụng sẽ tự động phân tích và lưu trữ cục bộ trên máy của bạn.</p>
                  <label className="inline-block px-10 py-4 bg-blue-600 text-white rounded-2xl font-black cursor-pointer shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
                    📁 Select Excel File
                    <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />
                  </label>
               </div>

               <div className="bg-red-50 p-10 rounded-[40px] border border-red-100 shadow-sm">
                  <h3 className="text-xl font-black text-red-900 mb-2">System Maintenance</h3>
                  <p className="text-red-600/70 text-sm mb-6">Xóa toàn bộ dữ liệu đã lưu trữ (tasks, capacity, settings) để quay về trạng thái mặc định.</p>
                  <button onClick={resetSystem} className="px-8 py-3 bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all">
                    Reset All Data
                  </button>
               </div>
             </div>
          )}
        </div>
      </main>

      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingContextMember(undefined); }} 
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        task={editingTask}
        contextMember={editingContextMember}
        currentUser={currentUser || ''}
      />
    </div>
  );
};

export default App;
