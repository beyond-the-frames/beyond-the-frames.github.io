(function () {
	const IMAGE_FILE_PATTERN = /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i;

	function inferGitHubRepo() {
		const host = window.location.hostname.toLowerCase();
		if (!host.endsWith("github.io")) {
			return null;
		}

		const owner = host.split(".")[0];
		const pathParts = window.location.pathname.split("/").filter(Boolean);
		const repo = pathParts.length > 0 ? pathParts[0] : owner + ".github.io";

		return { owner, repo };
	}

	function getRepoConfig() {
		if (window.PHOTO_REPO_CONFIG && window.PHOTO_REPO_CONFIG.owner && window.PHOTO_REPO_CONFIG.repo) {
			return {
				owner: String(window.PHOTO_REPO_CONFIG.owner),
				repo: String(window.PHOTO_REPO_CONFIG.repo)
			};
		}

		const inferred = inferGitHubRepo();
		if (inferred) {
			return inferred;
		}

		throw new Error(
			"Unable to infer GitHub repository from this URL. Set window.PHOTO_REPO_CONFIG = { owner: 'your-user', repo: 'your-repo' }."
		);
	}

	async function fetchJson(url) {
		const response = await fetch(url, {
			headers: {
				Accept: "application/vnd.github+json"
			}
		});

		if (!response.ok) {
			throw new Error("GitHub API request failed: " + response.status + " " + response.statusText);
		}

		return response.json();
	}

	function sortCaseInsensitive(values) {
		return values.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
	}

	async function loadPhotoCatalog() {
		const { owner, repo } = getRepoConfig();
		const base = "https://api.github.com/repos/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo) + "/contents/";

		const mediaItems = await fetchJson(base + "static/media");
		const folderItems = mediaItems
			.filter((item) => item && item.type === "dir")
			.map((item) => item.name);

		sortCaseInsensitive(folderItems);

		const categoryEntries = await Promise.all(
			folderItems.map(async (folderName) => {
				const folderItemsResponse = await fetchJson(base + "static/media/" + encodeURIComponent(folderName));
				const images = folderItemsResponse
					.filter((item) => item && item.type === "file" && IMAGE_FILE_PATTERN.test(item.name))
					.map((item) => item.name);

				sortCaseInsensitive(images);
				return [folderName, images];
			})
		);

		return Object.fromEntries(categoryEntries.filter((entry) => entry[1].length > 0));
	}

	window.loadPhotoCatalog = loadPhotoCatalog;
})();
