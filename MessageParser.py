import json
import os
import time

import pandas as pd
import numpy as np
from pandas.io.json import json_normalize

def apply_rename_group(df, index, groupname):
    df.loc[index:index,'content'] = 'NaN'
    df.loc[index:index,'type'] = 'GroupRename'
    df.loc[index:index,'details'] = groupname
    
def apply_add_participant(df, index, newcomer):
    df.loc[index:index,'content'] = 'NaN'
    df.loc[index:index,'type'] = 'AddParticipant'
    df.loc[index:index,'details'] = newcomer
    
def apply_participant_left(df, index, leaver):
    df.loc[index:index,'content'] = 'NaN'
    df.loc[index:index,'type'] = 'Leaver'
    df.loc[index:index,'details'] = leaver
    
def apply_changed_colour(df, index):
    df.loc[index:index,'content'] = 'NaN'
    df.loc[index:index,'type'] = 'ChangedColour'
    
def apply_changed_emoji(df, index, emoji):
    df.loc[index:index,'content'] = 'NaN'
    df.loc[index:index,'type'] = 'ChangedEmoji'
    df.loc[index:index,'details'] = emoji
	
	
ignored_keys = ['first_position', 
                'challenge', 
                'leaderboard',
                'score', 
                'personal_record', 
                'joined_video_call', 
                'started_video_call']

special_content = {'rename_group':'a nommé le groupe', 
 'first_position':'occupe la première position',
 'challenge':'vous a défié(e)',
 'changed_colour':'a modifié les couleurs de la discussion',
 'personal_record':'a battu son record personnel de', 
 'add_participant':'a ajouté', 
 'joined_video_call':'a rejoint l’appel vidéo de groupe.',
 'started_video_call':'a démarré une discussion vidéo de groupe.',
 'score': 'a marqué', 
 'leaderboard':'a gagné des places dans le leaderboard',
 'rsvp':'a répondu',
 'defined_pseudo':'a défini son propre pseudo',
 'changed_emoji':'a défini l’emoji sur',
 'participant_left':'a quitté le groupe'}

special_content_first_person = {'rename_group':'Vous avez nommé le groupe',
 'challenge':'Vous avez défié',
 'changed_colour':'Vous avez modifié les couleurs de la dicussion',
 'add_participant':'Vous avez ajouté',
 'joined_video_call':'Vous avez rejoint l’appel vidéo de groupe.',
 'started_video_call':'Vous avez démarré une discussion vidéo de groupe.',
 'score':'Vous avez marqué',
 'personal_record':'Vous avez battu votre record personnel de',
 'leaderboard':'Vous avez gagné des places dans le leaderboard',
 'changed_emoji':'Vous avez défini l’emoji sur'
 }

games = ['Jelly Crush.', 
         'in EverWing', 
         'Brick Pop.', 
         'Tower Match.', 
         'Hex FRVR.', 
         'Arkanoid.', 
         'Connect.', 
         'Word Streak With Friends.']
	
if __name__ == "__main__":
	base_directory = input('Please specify the working directory (if empty, current directory will be used).\n')
	if len(base_directory) == 0:
		base_directory = os.getcwd()
		
	t = time.time()
	print('\n')
	
	# Some filenames (input and output)
	filepath_json = base_directory + r'\message.json'

	cleaned_messages_json = base_directory + r'\cleaned_messages.json'
	cleaned_participants_json = base_directory + r'\cleaned_participants.json'
	cleaned_conversation_name_json = base_directory + r'\cleaned_conv_name.json'
	cleaned_conversation_emoji_json = base_directory + r'\cleaned_conv_emoji.json'
	cleaned_conversation_colour_json = base_directory + r'\cleaned_conv_colour.json'

	# Opening the file and loading the JSON
	with open(filepath_json, 'r', encoding='utf-8') as f:
		data_encoded = json.load(f)
	
	# Dealing with latin-1 characters encoded as \uxxxx in UTF-8 encoded JSON
	# in messages (content) and names (sender_name) 
	detected = []
	for i in range(0, len(data_encoded['messages'])):
		try:
			data_encoded['messages'][i]['sender_name'] = str(data_encoded['messages'][i]['sender_name'].encode('latin-1'), 'utf-8')
			data_encoded['messages'][i]['content'] = str(data_encoded['messages'][i]['content'].encode('latin-1'), 'utf-8')
			detected.append(data_encoded['messages'][i]['timestamp'])
		except:
			continue
			
	for i in range(0, len(data_encoded['participants'])):
		try:
			data_encoded['participants'][i] = str(data_encoded['participants'][i].encode('latin-1'), 'utf-8')
		except:
			continue
	
	# Loading everything into a Pandas DataFrame
	pd = json_normalize(data_encoded['messages'])
	pd_length = len(pd)
	
	# We've played quite a lot of EverWing... let's get rid of those messages.
	pd = pd[pd['content'].map(lambda x: not any(str(x).endswith(game) for game in games))]
	
	t1 = time.time()
	# There is no immediate way to identify who the user is, the easiest way is to ask...
	first_person = ''
	while len(first_person) == 0:
		try:
			i = 0
			print('The following persons have been detected as participants in the conversation.')
			for people in pd.sender_name.unique():
				#print('{0} - {1}'.format(i, people.encode('utf-8')))
				print('{0} - {1}'.format(i, people))
				i = i + 1
			single_person_index = input('Please input the number corresponding to you.\n')
			first_person = pd.sender_name.unique()[single_person_index]
		except:
			continue
	t2 = time.time()
	print('\n')
	
	# Parsing nicknames
	nicknames = {}
	nickname_string = 'a surnommé'
	nickname_first_person_string = 'a défini votre pseudo sur'

	criterion_has_nickame_string = pd['content'].map(lambda x: nickname_string in str(x))
	for elem in pd[criterion_has_nickame_string]['content']:
		for p in pd.sender_name.unique():
			line_data = elem[elem.find(nickname_string) + len(nickname_string) + 1:-1]
			if p in line_data:
				person = p
				nickname = line_data.split(p)[1].strip()
				#print('Found nickname {0} for person {1}'.format(nickname, person))
				if person not in nicknames.keys():
					#nicknames[person] = [person, nickname]
					nicknames[person] = [nickname]
				else:
					nicknames[person].append(nickname)
					
	criterion_has_first_person_nickame_string = pd['content'].map(lambda x: nickname_first_person_string in str(x))
	for elem in pd[criterion_has_first_person_nickame_string]['content']:
		nickname = elem[elem.find(nickname_first_person_string) + len(nickname_first_person_string) + 1:-1]
		if first_person not in nicknames.keys():
			#nicknames[first_person] = [first_person, nickname]
			nicknames[first_person] = [nickname]
		else:
			nicknames[first_person].append(nickname)

	nicknames_ = {}
	for person in nicknames.keys():
		nicknames_[person] = list(set(nicknames[person]))

	nicknames = nicknames_
	
	print('Found the following nicknames:')
	for k in nicknames.keys():
		print('{0} has the following nicknames: {1}'.format(k, nicknames[k]))

	print('\n')
	
	# Getting rid of some messages automatically sent to the conversation when some actions are performed.
	# Some of them will be ignored interely, other are interesting to keep.

	for people in pd.sender_name.unique():
		print('Cleaning messages of {0}'.format(people))
		# If this person has nicknames, we clean up messages for each nickname
		if people in nicknames.keys():
			for nickname in nicknames[people]:
				pd = pd[pd['content'].map(lambda x: not any(str(x).startswith(nickname + ' ' + special_content[k]) for k in ignored_keys))]
		# We also clean up for the complete name, using only the first part (firstname)
		pd = pd[pd['content'].map(lambda x: not any(str(x).startswith(people.split(' ')[0] + ' ' + special_content[k]) for k in ignored_keys))]
		
		# We are also dropping the lines where the content seems to contain only a URL 
		#(begins with http:// or https:// and has no space)
		pd = pd[pd['content'].map(lambda x: not (any(str(x).startswith(protocol) for protocol in ['http://', 'HTTP://', 'https://', 'HTTPS://']) and (not ' ' in str(x))))]
		
	# Cleaning up again, this time for messages sent by the "first person"
	criterion_single_person1 = pd['content'].map(lambda x: not any(str(x).startswith(s) for s in special_content_first_person))
	pd = pd[criterion_single_person1 | (pd['sender_name'] != first_person)]
	
	print('\n')
	# Dropping the rows of type "Shared" (not interesting in our case, but may be relevant in some cases... oh well...)
	pd = pd[pd.type == 'Generic']

	# Cleaning up the indexes (the index will not be continuous since we dropped some rows)
	df = pd.reset_index(drop=True)

	print('  Raw Dataframe had {0} rows.\nClean Dataframe has {1} rows.'.format(pd_length, len(df)))
	# Also adding a column which will contain some details in some special message cases

	print('\n')
	
	df['details'] = np.nan
	
	
	for people in df.sender_name.unique():
		
		if people == first_person:
			print('Processing first person...')
			
			criterion_first_person = df['sender_name'].map(lambda x: str(x) == str(people))
			for index in df[criterion_first_person].index:

				data = str(df.iloc[index]['content'])
				
				#rename group
				if special_content_first_person['rename_group'] in data:
					print('RENAME GROUP = Index: {0} ## Timestamp {2} ## Content: {1}'.format(index, df.iloc[index]['content'], df.iloc[index]['timestamp']))
					line = df.iloc[index]['content']
					groupname = line[line.find(special_content_first_person['rename_group']) + len(special_content_first_person['rename_group']):-1].strip()
					apply_rename_group(df, index, groupname)

				#added participant
				if special_content_first_person['add_participant'] in data:
					print('ADD PERSON = Index: {0} ## Timestamp {2} ## Content: {1}'.format(index, df.iloc[index]['content'], df.iloc[index]['timestamp']))
					line = df.iloc[index]['content']
					newcomer = line[line.find(special_content_first_person['add_participant']) + len(special_content_first_person['add_participant']):-1].strip()
					apply_add_participant(df, index, newcomer)

				#changed colour
				if special_content_first_person['changed_colour'] in data:
					print('CHANGED COLOUR = Index: {0} ## Timestamp {2} ## Content: {1}'.format(index, df.iloc[index]['content'], df.iloc[index]['timestamp']))
					apply_changed_colour(df, index)

				#changed emoji
				if special_content_first_person['changed_emoji'] in data:
					print('CHANGED EMOJI = Index: {0} ## Timestamp {2} ## Content: {1}'.format(index, df.iloc[index]['content'], df.iloc[index]['timestamp']))
					line = df.iloc[index]['content']
					emoji = line[line.find(special_content_first_person['changed_emoji']) + len(special_content_first_person['changed_emoji']):-1].strip()
					apply_changed_emoji(df, index, emoji)

			
		else:
			
			print(people)
			print('Processing participant name...')
			criterion = df['content'].map(lambda x: str(x).startswith(people.split(' ')[0] + ' '))
			criterion2 = df['sender_name'].map(lambda x: str(x) == str(people))
			for index in df[criterion & criterion2].index:
				#print('Index: {0} ## Content: {1}'.format(index, df.iloc[index]['content']))

				data = df.iloc[index]['content']

				# add participant
				if people.split(' ')[0] + ' ' + special_content['add_participant'] in data:
					print('ADD PERSON = Index: {0} ## Timestamp {2} ## Content: {1}'.format(index, df.iloc[index]['content'], df.iloc[index]['timestamp']))
					line = df.iloc[index]['content']
					newcomer = line[line.find(special_content['add_participant']) + len(special_content['add_participant']):-1].strip()
					apply_add_participant(df, index, newcomer)
					
				# rename group
				if people.split(' ')[0] + ' ' + special_content['rename_group'] in data:
					print('RENAME GROUP = Index: {0} ## Timestamp {2} ## Content: {1}'.format(index, df.iloc[index]['content'], df.iloc[index]['timestamp']))
					line = df.iloc[index]['content']
					groupname = line[line.find(special_content['rename_group']) + len(special_content['rename_group']):-1].strip()
					apply_rename_group(df, index, groupname)
					
				# changed colour
				if people.split(' ')[0] + ' ' + special_content['changed_colour'] in data:
					print('CHANGED COLOUR = Index: {0} ## Timestamp {2} ## Content: {1}'.format(index, df.iloc[index]['content'], df.iloc[index]['timestamp']))
					apply_changed_colour(df, index)
					
				# changed emoji
				if people.split(' ')[0] + ' ' + special_content['changed_emoji'] in data:
					print('CHANGED EMOJI = Index: {0} ## Timestamp {2} ## Content: {1}'.format(index, df.iloc[index]['content'], df.iloc[index]['timestamp']))
					line = df.iloc[index]['content']
					emoji = line[line.find(special_content['changed_emoji']) + len(special_content['changed_emoji']):-1].strip()
					apply_changed_emoji(df, index, emoji)
					
				# participant left
				if people + ' ' + special_content['participant_left'] in data:
					print('PERSON LEFT = Index: {0} ## Timestamp {2} ## Content: {1}'.format(index, df.iloc[index]['content'], df.iloc[index]['timestamp']))
					apply_participant_left(df, index, people)
					
					
			if people in nicknames.keys():
				for nickname in nicknames[people]:
					print('Processing nickname {0}'.format(nickname))
					criterion = df['content'].map(lambda x: str(x).startswith(nickname + ' '))
					criterion2 = df['sender_name'].map(lambda x: str(x) == str(people))
					for index in df[criterion & criterion2].index:

						data = df.iloc[index]['content']

						# rename group
						if nickname + ' ' + special_content['rename_group'] in data:
							print('RENAME GROUP = Index: {0} ## Timestamp {2} ## Content: {1}'.format(index, df.iloc[index]['content'], df.iloc[index]['timestamp']))
							line = df.iloc[index]['content']
							groupname = line[line.find(special_content['rename_group']) + len(special_content['rename_group']):-1].strip()
							apply_rename_group(df, index, groupname)
							
						# add participant
						if nickname + ' ' + special_content['add_participant'] in data:
							print('ADD PERSON = Index: {0} ## Timestamp {2} ## Content: {1}'.format(index, df.iloc[index]['content'], df.iloc[index]['timestamp']))
							line = df.iloc[index]['content']
							newcomer = line[line.find(special_content['add_participant']) + len(special_content['add_participant']):-1].strip()
							apply_add_participant(df, index, newcomer)
							
						# changed colour
						if nickname + ' ' + special_content['changed_colour'] in data:
							print('CHANGED COLOUR = Index: {0} ## Timestamp {2} ## Content: {1}'.format(index, df.iloc[index]['content'], df.iloc[index]['timestamp']))
							apply_changed_colour(df, index) 
						
						# changed emoji
						if nickname + ' ' + special_content['changed_emoji'] in data:
							print('CHANGED EMOJI = Index: {0} ## Timestamp {2} ## Content: {1}'.format(index, df.iloc[index]['content'], df.iloc[index]['timestamp']))
							line = df.iloc[index]['content']
							emoji = line[line.find(special_content['changed_emoji']) + len(special_content['changed_emoji']):-1].strip()
							apply_changed_emoji(df, index, emoji)
							
						# participant left
						if nickname + ' ' + special_content['participant_left'] in data:
							print('PERSON LEFT = Index: {0} ## Timestamp {2} ## Content: {1}'.format(index, df.iloc[index]['content'], df.iloc[index]['timestamp']))
							apply_participant_left(df, index, people)
			
		print('\n')
		
		
	# Let's drop some columns which contains data we are not really interested in
	try:
		del df['audio_files']
		del df['files']
		del df['gifs']
		del df['share']
		del df['sticker']
		del df['videos']
		del df['reactions']
		del df['photos']
	except:
		print('Failed to delete one or several column(s).')
		
	# For the 'Generic' rows (containing an actual message), let's fill the details field with the length of the message
	lengths = df['content'].str.len()
	df.ix[df['details'].isnull(), 'details'] = df.ix[df['details'].isnull(), 'details'].fillna(lengths)
	
	# Exporting as JSON files.
	df[df['type'] == 'Generic'].to_json(path_or_buf = cleaned_messages_json, orient='records')
	df[(df['type'] == 'AddParticipant') | (df['type'] == 'Leaver')].to_json(path_or_buf = cleaned_participants_json, orient='records')
	df[df['type'] == 'GroupRename'].to_json(path_or_buf = cleaned_conversation_name_json, orient='records')
	df[df['type'] == 'ChangedColour'].to_json(path_or_buf = cleaned_conversation_colour_json, orient='records')
	df[df['type'] == 'ChangedEmoji'].to_json(path_or_buf = cleaned_conversation_emoji_json, orient='records')
	

	t3 = time.time() - t - (t2 - t1)
	if t3 > 60 :
		t3_m = t3 / 60
		t3_s = t3 - int(t3_m) * 60
		if t3_m == 1:
			print('Finished in {1:.0f} minute and {0:.0f} seconds.'.format(t3_s, t3_m))
		else:
			print('Finished in {1:.0f} minutes and {0:.0f} seconds.'.format(t3_s, t3_m))
	else:
		print('Finished in {0:.2f} seconds.'.format(t3))
