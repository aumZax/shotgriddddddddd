export default function Ibox() {
    return (
        <div className="pt-14 min-h-screen m-0 p-0 bg-black">
            <header className="w-full h-16 px-4 flex items-center justify-between bg-gray-900 sticky top-0 z-40 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700/50 backdrop-blur-sm shadow-lg z-40">
                <div className="flex items-center gap-3">
                    <span className="text-3xl font-semibold text-gray-200 flex items-center px-8">
                        Inbox
                    </span>

                    {/* Dropdown */}
                    <select className="h-8 px-3 bg-gray-800 border border-gray-600 rounded text-gray-300 text-sm focus:outline-none focus:border-blue-500">
                        <option>All Types</option>
                    </select>

                    {/* Action buttons */}
                    <button className="hidden lg:flex h-8 px-3 text-gray-300 text-sm flex items-center  bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105">
                        Hide Read Messages
                    </button>

                    <button className="hidden lg:flex h-8 px-3 text-gray-300 text-sm flex items-center  bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105">
                        Mark All Read
                    </button>

                    {/* Refresh button */}
                    <button className="w-12 h-8 flex items-center justify-center  bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105">
                         <img
                            src="/icon/refresh.png"
                            className="max-w-6 max-h-6 object-contain"
                        />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search Inbox..."
                            className="w-40 md:w-56 lg:w-64 h-8 pl-3 pr-10 bg-gray-800/50 border border-gray-600/50 rounded-lg text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/80 focus:bg-gray-800/80 focus:shadow-lg focus:shadow-blue-500/20 transition-all duration-200"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                    </div>

                    {/* Settings button */}
                    <button className="w-12 h-8 flex items-center justify-center  bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-sm font-medium rounded-lg flex items-center gap-1 shadow-lg shadow-blue-500/30 transition-all duration-200 hover:shadow-blue-500/50 hover:scale-105">
                        <img
                            src="/icon/settings.png"
                            className="max-w-6 max-h-6 object-contain"
                        />
                    </button>
                </div>
            </header>

            <main className="flex h-[calc(100vh-8rem)]">
                {/* Sidebar */}
                <aside className="w-130 bg-gray-800 border-r border-gray-600 p-5">
                    <div className="text-gray-400 text-sm mb-4">
                        No new messages in your inbox
                    </div>
                    <button className="text-blue-500 text-sm hover:text-blue-400">
                        Show read messages
                    </button>
                </aside>

                {/* Main content */}
                <div className="flex-1 flex flex-col items-center justify-center bg-gray-900">
                    <div className="text-center">
                        <h2 className="text-2xl text-gray-200 mb-8">
                            This is your Inbox
                        </h2>
                        
                        {/* Empty inbox icon */}
                        <div className="mb-8">
                            <svg width="120" height="120" viewBox="0 0 120 120" className="mx-auto">
                                <path d="M80 40 L100 50 L100 80 L80 90 L60 80 L60 50 Z" fill="#666" />
                                <path d="M60 50 L80 40 L100 50 L80 60 Z" fill="#888" />
                                <path d="M60 50 L60 80 L80 90 L80 60 Z" fill="#555" />
                                <path d="M80 40 L95 48 L95 52 L80 44 Z" fill="#999" />
                            </svg>
                        </div>

                        <p className="text-gray-400 text-base mb-2">
                            The Inbox shows all the activity on things you are following.
                        </p>
                        <p className="text-gray-500 text-sm">
                            Select an inbox message on the left to view its details.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}