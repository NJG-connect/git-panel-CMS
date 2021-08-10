import { decodeUnicodeBase64, encodeUnicodeBase64 } from "../utils/encode";


const BASE_URL = "https://api.github.com/repos/"
async function fetchJsonDataFromGit(url: string, githubToken: string){
  // https://api.github.com/repos/NJG-connect/landingpageCMS/contents/src/data/services.json?ref=myCMS

  try {
    const reponse = await fetch(
      BASE_URL+url,
      {
        method: "GET",
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `token ${githubToken}`,
        },
      }
    );
    if (reponse.ok) {
      const responseJSON = await reponse.json();
      const data = JSON.parse(decodeUnicodeBase64(responseJSON.content));
      return {succes: true, data, sha: responseJSON.sha}
    }
    return {succes: false, data: reponse}
  } catch (error) {
      return {succes: false, data: error}
  }

}


async function updateJsonDataOnGit( url: string, branch: string, data:any, githubToken: string){
    
  try {

    // retrieve sha from the branch
    const infoJSON = await fetch(
      `${BASE_URL}${url}/commits?sha=${branch}`,
      {
        method: "GET",
      });
      const info = await infoJSON.json()

      // get the last sha from all commit
      const LastSha = info[0].sha

      

      // create a branch with the last commit 
      const nameOfnewBranch = `newBranch-${Date.now()}`;
    const reponseJSON = await fetch(
      BASE_URL+url+"/git/refs",
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `token ${githubToken}`,
        },
        body: JSON.stringify({
          "ref": `refs/heads/${nameOfnewBranch}`,
          "sha": LastSha,
            }),
      },
    );

    const response = await reponseJSON.json()
    const infoFromNewBranch =  {
      sha: response.sha,
      name: nameOfnewBranch,
      ref: response.ref
    }


    // for all modification file update 
    for await (const el of data) {
      const body = { 
        branch: infoFromNewBranch.name,
        sha: el.sha,
        content: encodeUnicodeBase64(JSON.stringify(el.data)),
        message: "🤗 File Update from NJG Connect CMS 🤗",
      }
        
       await fetch(
        `${BASE_URL}${url}/contents${el.file}`,
        {
          method: "PUT",
          headers: {
            Accept: "application/vnd.github.v3+json",
            Authorization: `token ${githubToken}`,
          },
          body: JSON.stringify(body),
        },
      );
    }
  

  // create a pull request with the new branch for apply content on favoris branch
   const createdPullRequestResponseJSON =  await fetch(
      `${BASE_URL}${url}/pulls`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `token ${githubToken}`,
        },
        body: JSON.stringify({
          title: "🤗 Pull Request from NJG Connect CMS 🤗",
          head: infoFromNewBranch.name,
          base: branch,
        }),
      },
    );
    const createdPullRequestResponse = await createdPullRequestResponseJSON.json();
      

    // merge new branch
    const mergedPullRequestJSON =  await fetch(
      `${BASE_URL}${url}/pulls/${createdPullRequestResponse.number}/merge`,
      {
        method: "PUT",
        headers: {
          Accept: "application/vnd.github.v3+json",
          Authorization: `token ${githubToken}`,
        },
        body: JSON.stringify({
          title: "🤗 Pull Request from NJG Connect CMS 🤗",
          head: infoFromNewBranch.name,
          base: branch,
        }),
      },
    );

    const mergedPullRequest = await mergedPullRequestJSON.json()

    if(mergedPullRequest.merged){
      return {succes: true, data: "success"}
    }
  return {succes: false, data: undefined}
  } catch (error) {
      return {succes: false, data: error}
  }

}


export { fetchJsonDataFromGit, updateJsonDataOnGit };