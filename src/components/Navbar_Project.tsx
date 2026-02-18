import { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";

interface NavbarProjectProps {
    activeTab?: string;
}

export default function Navbar_Project({ activeTab = 'ProDetail' }: NavbarProjectProps) {
    const [projectName, setProjectName] = useState('Loading...');
    const [loading, setLoading] = useState(true);
    const [, setError] = useState<string | null>(null);
    const [showOtherDropdown, setShowOtherDropdown] = useState(false);
    const [showProjectPagesDropdown, setShowProjectPagesDropdown] = useState(false);
    const otherDropdownRef = useRef<HTMLDivElement>(null);
    const projectPagesDropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadProjectFromStorage = () => {
            try {
                setLoading(true);
                setError(null);

                // 

// 
                // console.log('🔵 Loading project from storage');

                const storedData = localStorage.getItem('projectData');

                if (!storedData) {
                    // 
                    // console.warn('⚠️ No project data in localStorage');
                    setProjectName('No Project Data');
                    setError('Project data not found in storage');
                    setLoading(false);
                    return;
                }

                const projectData = JSON.parse(storedData);
                // 
                // console.log('📦 Loaded project data:', projectData);

                let name = null;

                if (projectData.projectName) {
                    name = projectData.projectName;
                    // 
                    // console.log('📦 Format 1 - Found project name at root:', name);
                }
                else if (projectData.projectInfo?.project?.projectName) {
                    name = projectData.projectInfo.project.projectName;
                    // 
                    // console.log('📦 Format 2 - Found project name in projectInfo.project:', name);
                }
                else if (projectData.projectInfo?.projects?.[0]?.projectName) {
                    name = projectData.projectInfo.projects[0].projectName;
                    // 
                    // console.log('📦 Format 3 - Found project name in projects array:', name);
                }
                else if (projectData.projectInfo?.projectName) {
                    name = projectData.projectInfo.projectName;
                    // 
                    // console.log('📦 Format 4 - Found project name in projectInfo:', name);
                }

                if (name) {
                    // 
                    // console.log('✨ Setting project name to:', name);
                    setProjectName(name);
                } else {
                    // 
                    // console.warn('⚠️ No project name found in data structure');
                    // 
                    // console.log('Available data structure:', Object.keys(projectData));
                    setProjectName('Untitled Project');
                    setError('Project name not found');
                }

            } catch (error) {
                // 
                // console.error('❌ Error loading project from storage:', error);
                if (error instanceof Error) {
                    setError(error.message);
                } else {
                    setError('Failed to load project data');
                }
                setProjectName('Error Loading Project');
            } finally {
                setLoading(false);
                // 
                // console.log('🏁 Load completed');
            }
        };

        loadProjectFromStorage();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (otherDropdownRef.current && !otherDropdownRef.current.contains(event.target as Node)) {
                setShowOtherDropdown(false);
            }
            if (projectPagesDropdownRef.current && !projectPagesDropdownRef.current.contains(event.target as Node)) {
                setShowProjectPagesDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const tabs = [
        { id: 'ProDetail', label: 'Project Details', show: 'always' },
        { id: 'Assets', label: 'Assets', show: 'always' },
        { id: 'Shots', label: 'Shots', show: 'sm' },
        { id: 'Sequence', label: 'Sequence', show: 'sm' },
        { id: 'Tasks', label: 'Tasks', show: 'sm' },
        { id: 'Video', label: 'Video', show: 'md' },
        { id: 'other', label: 'Other', hasDropdown: true, show: 'lg' },
    ];


    const otherMenuItems = [
        { id: 'people', label: 'People', icon: '👤', route: '/Others_People' },
        { id: 'bookings', label: 'Bookings', icon: '📅', route: '/Project_Bookings' },
        { id: 'client-users', label: 'Client Users', icon: '👥', route: '/Project_ClientUsers' },
        { id: 'contracts', label: 'Contracts', icon: '📄', route: '/Project_Contracts' },
        { id: 'cut-items', label: 'Cut Items', icon: '📁', route: '/Project_CutItems' },
        { id: 'cuts', label: 'Cuts', icon: '✂️', route: '/Project_Cuts' },
        { id: 'event-log', label: 'Event Log Entries', icon: '📋', route: '/Project_EventLog' },
        { id: 'files', label: 'Files', icon: '📎', route: '/Project_Files' },
        { id: 'notes', label: 'Notes', icon: '📝', route: '/Project_Notes' },
    ];

    const handleTabClick = (tabId: string) => {
        if (tabId === 'other') {
            setShowOtherDropdown(!showOtherDropdown);
            setShowProjectPagesDropdown(false);
        } else if (tabId === 'project-pages') {
            setShowProjectPagesDropdown(!showProjectPagesDropdown);
            setShowOtherDropdown(false);
        } else {
            const routes: Record<string, string> = {
                'ProDetail': '/Project_Detail',
                'Assets': '/Project_Assets',
                'Shots': '/Project_Shot',
                'Sequence': '/Project_Sequence',
                'Tasks': '/Project_Tasks',
                // 'Media': '/Project_Media',
                'Video': '/Others_Video',

            };

            if (routes[tabId]) {
                navigate(routes[tabId]);
            }
        }
    };

    const handleMenuItemClick = (route: string) => {
        navigate(route);
    };



    return (
        <header className="w-full h-12 px-6 flex items-center justify-between bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50 fixed z-[100] shadow-lg ">
            {/* Left section */}
            <div className="flex items-center gap-6">
                <div>
                    <h2 className="font-semibold text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 whitespace-nowrap">
                        {loading ? 'Loading...' : projectName.toUpperCase()}
                    </h2>
                </div>

                {/* Navigation tabs */}
                <nav className="flex items-center gap-1 ">
                    {tabs.map((tab) => (
                        <div key={tab.id} className="relative" ref={tab.id === 'other' ? otherDropdownRef : tab.id === 'project-pages' ? projectPagesDropdownRef : null}>
                            <button
                                onClick={() => handleTabClick(tab.id)}
                                className={` px-4 py-2 text-sm rounded-lg transition-all duration-200 whitespace-nowrap
                                        ${
                                            activeTab === tab.id
                                                ? 'flex' // 👈 หน้า current แสดงเสมอ
                                                : tab.show === 'lg'
                                                    ? 'hidden lg:flex'
                                                    : tab.show === 'md'
                                                        ? 'hidden md:flex'
                                                        : tab.show === 'sm'
                                                            ? 'hidden sm:flex'
                                                            : 'flex'
                                        }


                                        ${activeTab === tab.id
                                        ? 'text-blue-400 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105'
                                        : 'text-gray-300 bg-gradient-to-r from-gray-600 to-gray-500 hover:from-gray-700 hover:to-gray-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-gray-500/30 transition-all duration-200 hover:shadow-gray-500/50 hover:scale-105'
                                    }
                                `}
                            >
                                {tab.label}
                                {tab.hasDropdown && (
                                    <svg
                                        className={`w-4 h-4 transition-transform duration-200 ${(tab.id === 'other' && showOtherDropdown) ||
                                            (tab.id === 'project-pages' && showProjectPagesDropdown)
                                            ? 'rotate-180' : ''
                                            }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                                {activeTab === tab.id && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"></span>
                                )}
                            </button>

                            {/* Dropdown Menu for Other */}
                            {tab.id === 'other' && showOtherDropdown && (
                                <div className="absolute top-full left-0 mt-1 w-56 bg-gray-900 border border-gray-700/70 rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-sm">
                                    {otherMenuItems.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleMenuItemClick(item.route)}
                                            className="bg-gradient-to-r from-blue-800 to-cyan-600 hover:from-blue-700 hover:to-cyan-500 w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-gray-700/80 hover:text-white transition-all duration-150 flex items-center gap-3 border-b border-gray-800 last:border-b-0"
                                        >
                                            <span className="text-base">{item.icon}</span>
                                            <span>{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                         
                        </div>
                    ))}
                </nav>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-3 hidden md:inline-block">
                <button
                    className=" px-4 py-2 text-sm text-gray-200 bg-gradient-to-r from-blue-800 to-blue-700 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105 whitespace-nowrap"
                >
                    Project Actions
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>
        </header>
    );
}