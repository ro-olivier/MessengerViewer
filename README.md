## MessengerViewer

This is simple (and very crude) dataviz for (FB) Messenger data.

The Python script will take as input the 'message.json' file from one of the conversations in your Messenger data (go get it from Facebook!) and will build a JSON file with the message and characters count per week.

The script is interactive, and will ask a few questions: it will parse the name of participants in the conversation and ask who you are to parse relevant message accordingly, it will also give you a change to ignore some people in the conversation (we all have this friend...).
For a three-year convo with a quarter million messages, it takes about three minutes to run.

For now, the Python script only parses conversations where Facebook was either in French. It also ignores messages posted automatically by _some_ games. **Additions welcome**.

This data is then used by the D3JS script to build the dataviz.
The dataviz lets you :
- switch between count of message or character, per user,
- activate/deactivate users,
- selected start and end date for the dataviz (and reset those)
- and of course visualize the data with a chart.