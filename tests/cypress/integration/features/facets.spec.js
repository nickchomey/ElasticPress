describe('Facets Feature', () => {
	/**
	 * Create a facets widget.
	 *
	 * @param {string} title The widget title
	 * @param {string} category The category slug.
	 */
	function createWidget(title, category) {
		cy.intercept('/wp-json/wp/v2/widget-types/*/encode*').as('legacyWidgets');
		cy.openWidgetsPage();

		cy.get('.edit-widgets-header-toolbar__inserter-toggle').click();
		cy.get('.block-editor-inserter__panel-content [class*="legacy-widget/ep-facet"]').click({
			force: true,
		});
		cy.wait('@legacyWidgets');
		// eslint-disable-next-line cypress/no-unnecessary-waiting -- JS processing
		cy.wait(1000);

		cy.get('.is-opened .widget-ep-facet')
			.last()
			.within(() => {
				cy.get('input[name^="widget-ep-facet"][name$="[title]"]').clearThenType(
					title,
					true,
				);
				cy.get('select[name^="widget-ep-facet"][name$="[facet]"]').select(category);
			});

		/**
		 * Wait for WordPress to recognize the title typed.
		 *
		 * @todo investigate why this is needed.
		 */
		// eslint-disable-next-line cypress/no-unnecessary-waiting
		cy.wait(2000);

		cy.get('.edit-widgets-header__actions .components-button.is-primary').click();
		cy.get('body').should('contain.text', 'Widgets saved.');
	}

	before(() => {
		cy.maybeEnableFeature('facets');

		cy.wpCli('widget reset --all');
		cy.wpCli('elasticpress index --setup --yes');

		// Initial widget that will be used for all tests.
		createWidget('Facet (categories)', 'category');
	});

	it('Can see the widget in the frontend', () => {
		cy.visit('/');

		// Check if the widget is visible.
		cy.get('.widget_ep-facet').should('be.visible');
		cy.contains('.widget-title', 'Facet (categories)').should('be.visible');
	});

	it('Can use widgets', () => {
		// Create a second widget, so we can test both working together.
		createWidget('Facet (Tags)', 'post_tag');

		cy.visit('/');

		// We should have two widgets now, one of them the created above.
		cy.get('.widget_ep-facet').should('have.length', 2);
		cy.contains('.widget-title', 'Facet (Tags)').should('be.visible');

		// Check if the widget search works. Additionally, checks a hyphenated slug category.
		cy.get('.widget_ep-facet').first().as('firstWidget');
		cy.get('@firstWidget').find('.facet-search').clearThenType('Parent C');
		cy.get('@firstWidget').contains('.term', 'Parent Category').should('be.visible');
		cy.get('@firstWidget').contains('.term', 'Child Category').should('not.be.visible');

		// Searching in the first widget should not affect the second.
		cy.get('.widget_ep-facet').last().as('lastWidget');
		cy.get('@lastWidget').contains('.term', 'content').should('be.visible');

		// Clear the search input and click in a term that was not visible before.
		cy.get('@firstWidget').find('.facet-search').clear();
		cy.get('@firstWidget').contains('.term', 'Classic').click();

		// URL should have changed and selected term should be marked as checked.
		cy.url().should('include', 'ep_filter_category=classic');
		cy.get('@firstWidget')
			.contains('.term', 'Classic')
			.find('.ep-checkbox')
			.should('have.class', 'checked');

		// Visible articles should contain the selected category.
		cy.get('article').each(($article) => {
			cy.wrap($article).contains('.cat-links a', 'Classic').should('be.visible');
		});

		// Check pagination.
		cy.get('.next.page-numbers').click();
		cy.url().should('include', 'page/2/?ep_filter_category=classic');
		cy.get('article').each(($article) => {
			cy.wrap($article).contains('.cat-links a', 'Classic').should('be.visible');
		});

		// Check if pagination resets when clicking on a different term.
		cy.get('@firstWidget').contains('.term', 'Post Formats').click();
		cy.url().should('include', 'ep_filter_category=classic%2Cpost-formats');
		cy.url().should('not.include', 'page');
	});
});
