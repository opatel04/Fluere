import React from 'react';
import { ActivityCalendar } from 'react-activity-calendar';
import { useTheme } from 'next-themes';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css';
import { cn } from '@/lib/utils';

interface ActivityHeatmapProps {
    data: { date: string; count: number }[];
    className?: string;
}

export function ActivityHeatmap({ data, className }: ActivityHeatmapProps) {
    const { theme, resolvedTheme } = useTheme();

    // Calculate levels (0-4) based on count
    const maxCount = Math.max(...data.map(d => d.count), 1);

    const dataWithLevels = data.map(item => {
        let level = 0;
        if (item.count > 0) {
            const ratio = item.count / maxCount;
            if (ratio <= 0.25) level = 1;
            else if (ratio <= 0.5) level = 2;
            else if (ratio <= 0.75) level = 3;
            else level = 4;
        }
        return { ...item, level };
    });

    // Ensure we show full weeks for a perfectly symmetrical grid (Sunday to Saturday)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

    // Snap end date to the coming Saturday (or today if it is Saturday)
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7; // Ensure it's always positive or zero
    const endDateObj = new Date(today);
    endDateObj.setDate(today.getDate() + daysUntilSaturday);

    // Show exactly 53 weeks to cover a full year + overlap for symmetry
    const weeksToShow = 53;
    const daysToShow = weeksToShow * 7;
    const startDateObj = new Date(endDateObj);
    startDateObj.setDate(endDateObj.getDate() - daysToShow + 1);

    const startDate = startDateObj.toISOString().split('T')[0];
    const endDate = endDateObj.toISOString().split('T')[0];

    const fullData = [
        { date: startDate, count: 0, level: 0 },
        ...dataWithLevels,
        { date: endDate, count: 0, level: 0 }
    ].sort((a, b) => a.date.localeCompare(b.date));

    // Remove duplicates (keep the one with actual data if exists)
    const uniqueData = Array.from(new Map(fullData.map(item => [item.date, item])).values());

    return (
        <div className={cn("w-full overflow-x-auto", className)}>
            <ActivityCalendar
                data={uniqueData}
                weekStart={0} // Force Sunday start
                theme={{
                    light: ['#e2e8f0', '#bfdbfe', '#60a5fa', '#2563eb', '#1e40af'],
                    dark: ['#666666', '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6'],
                }}
                colorScheme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                showWeekdayLabels
                labels={{
                    totalCount: '{{count}} activities in the last year'
                }}
                renderBlock={(block, activity) =>
                    React.cloneElement(block, {
                        'data-tooltip-id': 'react-tooltip',
                        'data-tooltip-content': `${activity.count} activities on ${activity.date}`,
                    })
                }
            />
            <ReactTooltip id="react-tooltip" />
        </div>
    );
}
