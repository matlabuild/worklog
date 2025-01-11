import { useMemo } from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

interface WorkSession {
  id: string;
  startTime: { seconds: number };
  endTime: { seconds: number };
  projectName: string;
  focusLevel: number;
}

interface DayCalendarProps {
  sessions: WorkSession[];
  date: Date;
  onDateChange: (newDate: Date) => void;
}

export function DayCalendar({ sessions, date, onDateChange }: DayCalendarProps) {
  // Generate time slots for the day (6 AM to 11 PM)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 6; hour <= 23; hour++) {
      slots.push(new Date(date).setHours(hour, 0, 0, 0));
    }
    return slots;
  }, [date]);

  const handlePrevDay = () => {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() - 1);
    onDateChange(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(date);
    newDate.setDate(date.getDate() + 1);
    onDateChange(newDate);
  };

  // Calculate position and height for each session block
  const sessionBlocks = useMemo(() => {
    return sessions.map(session => {
      const startTime = new Date(session.startTime.seconds * 1000);
      const endTime = new Date(session.endTime.seconds * 1000);
      
      // Calculate position and size
      const totalMinutes = 17 * 60; // 17 hours (6 AM - 11 PM)
      
      const startMinutes = (startTime.getHours() - 6) * 60 + startTime.getMinutes();
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      
      const top = (startMinutes / totalMinutes) * 100;
      const height = (duration / totalMinutes) * 100;
      
      return {
        ...session,
        top: `${top}%`,
        height: `${height}%`
      };
    });
  }, [sessions, date]);

  return (
    <div className="bg-white rounded-lg shadow p-4 w-80 mt-[52px]">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevDay}
          className="p-1 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          title="Previous day"
        >
          <HiChevronLeft className="w-5 h-5" />
        </button>
        
        <h3 className="text-lg font-medium text-gray-900">
          {date.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}
        </h3>
        
        <button
          onClick={handleNextDay}
          className="p-1 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          title="Next day"
        >
          <HiChevronRight className="w-5 h-5" />
        </button>
      </div>
      
      <div className="relative h-[600px] overflow-y-auto">
        {/* Time markers and grid container */}
        <div className="absolute inset-0 min-h-full">
          <div className="absolute inset-0" style={{ height: '1020px' }}>
            <div className="h-full grid grid-cols-[4rem_1fr]">
              {/* Time markers */}
              <div className="relative h-full">
                <div className="absolute inset-y-0 right-0 w-px bg-gray-100" /> {/* Consistent right border */}
                {timeSlots.map(time => (
                  <div 
                    key={time} 
                    className="absolute left-0 right-2 text-xs text-gray-500 -translate-y-3"
                    style={{ 
                      top: `${(new Date(time).getHours() - 6) * 60}px`
                    }}
                  >
                    {new Date(time).toLocaleTimeString('en-US', { 
                      hour: 'numeric',
                      hour12: true
                    })}
                  </div>
                ))}
              </div>

              {/* Grid and sessions container */}
              <div className="relative h-full">
                {/* Grid lines */}
                {timeSlots.map(time => (
                  <div
                    key={time}
                    className="absolute inset-x-0 border-t border-gray-100"
                    style={{ 
                      top: `${(new Date(time).getHours() - 6) * 60}px`
                    }}
                  />
                ))}

                {/* Session blocks */}
                {sessionBlocks.map(session => {
                  const startTime = new Date(session.startTime.seconds * 1000);
                  const endTime = new Date(session.endTime.seconds * 1000);
                  
                  // Calculate pixels from 6 AM
                  const startMinutes = (startTime.getHours() - 6) * 60 + startTime.getMinutes();
                  const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
                  
                  return (
                    <div
                      key={session.id}
                      className="absolute inset-x-1 rounded-md bg-blue-100 border border-blue-200 p-2 overflow-hidden hover:bg-blue-200 transition-colors cursor-pointer"
                      style={{ 
                        top: `${startMinutes}px`,
                        height: `${durationMinutes}px`
                      }}
                      title={`${session.projectName} (Focus: ${session.focusLevel}/10)`}
                    >
                      <div className="text-xs font-medium text-blue-800 truncate">
                        {session.projectName}
                      </div>
                      <div className="text-xs text-blue-600">
                        {startTime.toLocaleTimeString('en-US', { 
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 