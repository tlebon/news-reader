# NewsReader

This is a news reader and summarizing app I built to try to match the specifications given in the challenge. I tried to choose the most pragmatic tooling and technology options to create a nice experience for the end user.

The app pulls news articles from an api and sends them to claude for sentiment/summary/topic clustering. 

Stack:
FE:
React
Typescript
TailwindCSS

BE:
node
express
sqlite

## How you would take this prototype to production

I didn't focus on testing so much. I also decided to keep the codebase more simple. we are also using sqlite.

## What you would improve or redesign with more time

I still think Id test differnt layouts a bit more to try to find the best one. I think there could be nice ways to interact with the data that I havent landed on yet. In general I'm happy with the brief but I think it could probably be expanded.

## What technical/product trade-offs you made during the task

* tanstack/react query vs fetch - fetch is simpler, no need to use tanstack for this scale.
* sqlite vs localstorage vs caching (tanstack/server) - sqlite allows for persistence without overhead of full postgres implementation
* vite + express vs next- vite and express is simple.
* embedding vs prompting - embedding adds too much bloat for the value it adds for this scale.

## Considerations for scaling, reliability, performance, or UX

i was experimenting with clustering/embedding but i think for this use case and project size it felt like overkill in the end. its also not a topic i am the most familiar with so i didnt think it made sense to implement it so i stripped it from the final. probably you would eventually need to switch to postgres or something. 

## Any tooling, architecture, or model choice decisions you would revisit

for the best user experience it probably makes sense to call the AI before a user visits the pages and have the summary preloaded? that would remove some latency.