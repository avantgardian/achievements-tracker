describe('Sanity', () => {
    beforeEach(() => {
        cy.visit('./index.html')
    })

    it('Game Grid should exist', () => {
        cy.get('.games-grid').should('exist')
    })

    it('Game Cards should exist', () => {
        cy.get('.games-grid')
            .should('exist')
            .children()
            .should('have.length.at.least', 1)
            .and('have.class', 'game-card')
    })
})

