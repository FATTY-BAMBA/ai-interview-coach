# Update interview page
with open('app/interview/[roomName]/page.tsx', 'r') as f:
    content = f.read()

old_header = '''      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">{typeInfo.icon}</div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{typeInfo.name}</h1>
                <p className="text-sm text-gray-500">Room: {roomName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
        </div>
      </header>'''

new_header = '''      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg font-bold">L</span>
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  LyraAI
                </span>
              </div>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{typeInfo.icon}</div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{typeInfo.name}</h1>
                  <p className="text-sm text-gray-500">Room: {roomName}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          </div>
        </div>
      </header>'''

content = content.replace(old_header, new_header)

with open('app/interview/[roomName]/page.tsx', 'w') as f:
    f.write(content)

print("✅ Interview page updated!")

# Update evaluation page if it exists
try:
    with open('app/evaluation/[sessionId]/page.tsx', 'r') as f:
        eval_content = f.read()
    
    # Add LyraAI to evaluation page header (if it has one)
    if 'Interview Evaluation' in eval_content:
        eval_content = eval_content.replace(
            'Interview Evaluation',
            'LyraAI - Interview Evaluation'
        )
        with open('app/evaluation/[sessionId]/page.tsx', 'w') as f:
            f.write(eval_content)
        print("✅ Evaluation page updated!")
except:
    print("⚠️  Evaluation page not updated (might not exist)")

print("\n🎉 LyraAI branding complete!")
