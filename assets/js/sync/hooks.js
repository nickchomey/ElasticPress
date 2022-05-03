/**
 * WordPress imports.
 */
import apiFetch from '@wordpress/api-fetch';
import { useCallback, useRef } from '@wordpress/element';

/**
 * Local imports.
 */
import { ajax_url, nonce } from './config';

/**
 * Indexing hook.
 *
 * Provides methods for indexing, getting indexing status, and cancelling
 * indexing. Methods share an abort controller so that requests can
 * interrupt eachother to avoid multiple sync requests causing race conditions
 * or duplicate output, such as by rapidly pausing and unpausing indexing.
 *
 * @returns {object} Sync, sync status, and cancel functions.
 */
export const useIndex = () => {
	const abort = useRef(new AbortController());
	const request = useRef(null);

	const cancelIndex = useCallback(
		/**
		 * Send a request to cancel sync.
		 *
		 * @returns {Promise} Fetch request promise.
		 */
		async () => {
			abort.current.abort();
			abort.current = new AbortController();

			const url = ajax_url;
			const method = 'POST';
			const body = new FormData();
			const { signal } = abort.current;

			body.append('action', 'ep_cancel_index');
			body.append('nonce', nonce);

			request.current = apiFetch({ url, method, body, signal })
				.catch((error) => {
					if (error?.name !== 'AbortError' && !request.current) {
						throw error;
					}
				})
				.finally(() => {
					request.current = null;
				});

			return request.current;
		},
		[],
	);

	const index = useCallback(
		/**
		 * Send a request to sync.
		 *
		 * @param {boolean} putMapping Whether to put mapping.
		 * @returns {Promise} Fetch request promise.
		 */
		async (putMapping) => {
			abort.current.abort();
			abort.current = new AbortController();

			const url = ajax_url;
			const method = 'POST';
			const body = new FormData();
			const { signal } = abort.current;

			body.append('action', 'ep_index');
			body.append('put_mapping', putMapping ? 1 : 0);
			body.append('nonce', nonce);

			request.current = apiFetch({ url, method, body, signal })
				.catch((error) => {
					if (error?.name !== 'AbortError' && !request.current) {
						throw error;
					}
				})
				.finally(() => {
					request.current = null;
				});

			return request.current;
		},
		[],
	);

	const indexStatus = useCallback(
		/**
		 * Send a request for CLI sync status.
		 *
		 * @returns {Promise} Fetch request promise.
		 */
		async () => {
			abort.current.abort();
			abort.current = new AbortController();

			const url = ajax_url;
			const method = 'POST';
			const body = new FormData();
			const { signal } = abort.current;

			body.append('action', 'ep_cli_index');
			body.append('nonce', nonce);

			request.current = apiFetch({ url, method, body, signal })
				.catch((error) => {
					if (error?.name !== 'AbortError' && !request.current) {
						throw error;
					}
				})
				.finally(() => {
					request.current = null;
				});

			return request.current;
		},
		[],
	);

	return { cancelIndex, index, indexStatus };
};