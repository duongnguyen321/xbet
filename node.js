const puppeteer = require('puppeteer');
const fs = require('fs');
const _ = require('lodash');
const chalk = require('chalk'); // Import chalk
const BASE_URL = 'https://www.xbet.ag/sportsbook';

// Function to scrape the data
async function scrapeData(browser, path) {
    console.info(chalk.blue(`Navigating to path: ${path}`));
    console.time(`Time taken for ${path}`); // Start timing for each path

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

        console.info(chalk.yellow("Waiting for the main sportsbook container to load..."));

        // Wait for the main container with game lines to appear
        await page.waitForSelector('#main-sportsbook-container .game-lines .line-default', { timeout: 60000 });

        console.info(chalk.green("Extracting data..."));

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
                    game.homeTeam = {
                        name: teamNames[0].innerText.trim(),
                        isVisitor: false
                    };
                    game.visitorTeam = {
                        name: teamNames[1].innerText.trim(),
                        isVisitor: true
                    };
                }

                game.odds = [];
                odds.forEach((oddsButton) => {
                    const gameId = oddsButton.getAttribute('data-gameid');
                    const sportId = oddsButton.getAttribute('data-sport-id');
                    const leagueId = oddsButton.getAttribute('data-league-id');
                    const scoreId = oddsButton.getAttribute('data-score-id');
                    const lineTournamentId = oddsButton.getAttribute('data-linetournamentid');
                    const marketId = oddsButton.getAttribute('data-marketid');
                    const outComeId = oddsButton.getAttribute('data-outcomeid');
                    const description = oddsButton.getAttribute('data-description');
                    const date = oddsButton.getAttribute('data-gamedate'); // date bet
                    const dataOdds = oddsButton.getAttribute('data-odds');
                    const dataOdd = oddsButton.getAttribute('data-odd');
                    const type = oddsButton.getAttribute('data-wager-type');
                    const team = oddsButton.getAttribute('data-team');
                    const teamVs = oddsButton.getAttribute('data-team-vs');
                    const spread = oddsButton.getAttribute('data-spread');
                    const points = oddsButton.getAttribute('data-points');
                    const oddsValue = oddsButton.innerText.trim();
                    // Derive names based on IDs where possible
                    const name = `${description} - TeamA: ${team}, TeamB: ${teamVs}`;
                    const dateBet = new Date(date).toISOString()
                    const datePlay = new Date(date)
                    datePlay.setHours(new Date(dateBet).getHours() + 1)

                    const father = oddsButton.parentElement
                    // if index = 0 => Spread
                    // if index = 1 => Moneyline
                    // if index = 2 => Total
                    const index = Array.from(father.children).indexOf(oddsButton);
                    let typeBet;
                    if (index === 0) {
                        typeBet = 'Spread';
                    } else if (index === 1) {
                        typeBet = 'Moneyline';
                    } else if (index === 2) {
                        typeBet = 'Total';
                    } else {
                        typeBet = 'Unknown'; // Fallback in case of unexpected index
                    }
                    const odd = {
                        typeBet,
                        gameId,
                        name,
                        sportId,
                        leagueId,
                        scoreId,
                        lineTournamentId,
                        marketId,
                        outComeId,
                        description,
                        dateBet: dateBet,
                        datePlay: datePlay.toISOString(),
                        dataOdds,
                        dataOdd,
                        type,
                        team,
                        teamVs,
                        oddsValue,
                        spread,
                        points,
                        isVisitor: oddsButton.closest('.game-line__visitor-line') ? true : false
                    };

                    if (gameId && sportId) {
                        game.odds.push(odd);
                    }
                });

                games.push(game);
            });

            return games;
        });

        const groupedData = _.groupBy(gameData.flatMap(game => game.odds), 'gameId');
        fs.writeFileSync(`./database/grouped-${path.replace(/\//g, '')}.json`, JSON.stringify(groupedData, null, 2), 'utf-8');
        console.log(chalk.magenta(`Grouped data has been saved for path ${path}`));
    } catch (error) {
        console.error(chalk.red(`Error during scraping for path ${path}:`), error);
    } finally {
        console.timeEnd(`Time taken for ${path}`); // End timing for each path
        await page.close();
    }
}

// Main function to launch the browser and iterate over paths
(async () => {
    console.info(chalk.blue("Launching browser..."));
    console.time("Total time for all paths"); // Start timing for all paths
    const browser = await puppeteer.launch({ headless: true });

    const navPath = require('./utils/path.json');
    for (const path of navPath) {
        await scrapeData(browser, path);
    }

    console.timeEnd("Total time for all paths"); // End timing for all paths
    console.info(chalk.blue("Closing the browser..."));
    await browser.close();
})();
