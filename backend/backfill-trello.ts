import db from './src/config/database';

// Using a known email ID from the debug output and a dummy Trello card ID for testing
const EMAIL_ID = 'c9244008-f2af-439a-9d8b-a69750ff4d13';
const TRELLO_CARD_ID = '6746b76174620573934d706e'; // Example ID

async function backfillTrelloId() {
    try {
        console.log(`Backfilling email ${EMAIL_ID} with Trello Card ID ${TRELLO_CARD_ID}`);
        await db.query(`UPDATE emails SET trello_card_id = $1 WHERE id = $2`, [TRELLO_CARD_ID, EMAIL_ID]);
        console.log('Update successful');
    } catch (error) {
        console.error('Error updating email:', error);
    } finally {
        // @ts-ignore
        if (db.end) await db.end();
        process.exit();
    }
}

backfillTrelloId();
