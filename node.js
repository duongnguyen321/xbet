const puppeteer = require('puppeteer');
const fs = require('fs');
const _ = require('lodash');
const BASE_URL = 'https://www.xbet.ag/sportsbook';

// Function to scrape the data
async function scrapeData(browser, path) {
    console.info(`Navigating to path: ${path}`);

    const page = await browser.newPage();

    // Use random user agent for better anonymity
    const randomUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    await page.setUserAgent(randomUserAgent);

    try {
        // Go to the target URL
        await page.goto(BASE_URL + path, {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        console.info("Waiting for the main sportsbook container to load...");

        // Wait for the main container with game lines to appear
        await page.waitForSelector('#main-sportsbook-container .game-lines .line-default', { timeout: 60000 });

        console.info("Extracting data...");

        const gameData = await page.evaluate(() => {
            const games = [];
            const gameLines = document.querySelectorAll('#main-sportsbook-container .game-lines .line-default');

            gameLines.forEach((gameLine) => {
                const game = {};
                const dateElement = gameLine.querySelector('.container-fluid .row.game-line__header .game-line__header_date .game-line__time__date [data-time]');
                if (dateElement) game.date = dateElement.getAttribute('data-time');

                const teamNames = gameLine.querySelectorAll('.game-line__home-team a, .game-line__visitor-team a');
                const odds = gameLine.querySelectorAll('.game-line__home-line button, .game-line__visitor-line button');

                if (teamNames.length === 2) {
                    game.homeTeam = teamNames[0].innerText.trim();
                    game.visitorTeam = teamNames[1].innerText.trim();
                }

                game.odds = [];
                odds.forEach((oddsButton) => {
                    const odd = {
                        description: oddsButton.getAttribute('data-description'),
                        gameId: oddsButton.getAttribute('data-gameid'),
                        sportId: oddsButton.getAttribute('data-sport-id'),
                        leagueId: oddsButton.getAttribute('data-league-id'),
                        scoreId: oddsButton.getAttribute('data-score-id'),
                        lineTournamentId: oddsButton.getAttribute('data-linetournamentid'),
                        marketId: oddsButton.getAttribute('data-marketid'),
                        outComeId: oddsButton.getAttribute('data-outcomeid'),
                        date: oddsButton.getAttribute('data-gamedate'),
                        dataOdds: oddsButton.getAttribute('data-odds'),
                        dataOdd: oddsButton.getAttribute('data-odd'),
                        type: oddsButton.getAttribute('data-wager-type'),
                        team: oddsButton.getAttribute('data-team'),
                        teamVs: oddsButton.getAttribute('data-team-vs'),
                        oddsValue: oddsButton.innerText.trim(),
                        spread: oddsButton.getAttribute('data-spread'),
                        points: oddsButton.getAttribute('data-points'),
                    };
                    if (odd.gameId && odd.sportId) {
                        game.odds.push(odd);
                    }
                });

                games.push(game);
            });

            return games;
        });

        const groupedData = _.groupBy(gameData.flatMap(game => game.odds), 'gameId');
        fs.writeFileSync(`./database/grouped-${path.replace(/\//g, '')}.json`, JSON.stringify(groupedData, null, 2), 'utf-8');
        console.log(`Grouped data has been saved for path ${path}`);
    } catch (error) {
        console.error(`Error during scraping for path ${path}:`, error);
    } finally {
        await page.close();
    }
}

// Main function to launch the browser and iterate over paths
(async () => {
    console.info("Launching browser...");
    const browser = await puppeteer.launch({ headless: true });

    const navPath = require('./utils/path.json');
    for (const path of navPath) {
        await scrapeData(browser, path);
    }

    console.info("Closing the browser...");
    await browser.close();
})();
