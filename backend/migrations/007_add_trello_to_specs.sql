-- Add Trello columns to project_specs
ALTER TABLE project_specs 
ADD COLUMN IF NOT EXISTS trello_card_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS trello_board_id VARCHAR(255);
