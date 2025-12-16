-- Add trello_card_id to emails table
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS trello_card_id VARCHAR(255);
