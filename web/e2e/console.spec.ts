import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Chaque test part d'une base de démo neuve.
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/');
});

test('redirige vers la connexion et refuse un mauvais mot de passe', async ({ page }) => {
  await expect(page).toHaveURL(/\/connexion/);
  await page.getByLabel('Courriel').fill('demo@kontwa.app');
  await page.getByLabel('Mot de passe').fill('mauvais-mdp');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('alert')).toContainText('incorrect');
});

test('traite une commande de bout en bout', async ({ page }) => {
  await page.getByRole('button', { name: 'Remplir avec le compte démo' }).click();
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/commandes$/);

  // Une commande « reçue » : on ouvre son détail et on la fait avancer jusqu'à « livrée ».
  await page.getByRole('tab', { name: /^Reçue/ }).click();
  await page.locator('.row-link').first().click();
  await expect(page.getByRole('heading', { name: 'Suivi' })).toBeVisible();

  await page.getByRole('button', { name: 'Commencer la préparation' }).click();
  await page.getByRole('button', { name: 'Marquer prête' }).click();
  await page.getByRole('button', { name: 'Marquer livrée' }).click();
  await expect(page.getByText('Aucune action possible')).toBeVisible();
});

test('ajoute un produit au catalogue', async ({ page }) => {
  await page.getByRole('button', { name: 'Remplir avec le compte démo' }).click();
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/commandes$/);
  await page.getByRole('link', { name: 'Catalogue' }).click();

  await page.getByRole('button', { name: '+ Nouveau produit' }).click();
  await page.getByLabel('Nom').fill('Plantain frit');
  await page.getByLabel('Prix (FCFA)').fill('1000');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Plantain frit')).toBeVisible();
});

test('simule une nouvelle commande WhatsApp', async ({ page }) => {
  await page.getByRole('button', { name: 'Remplir avec le compte démo' }).click();
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.getByRole('button', { name: '+ Simuler une commande' }).click();
  await expect(page.locator('.row--fresh').first()).toBeVisible();
  await expect(page.getByText('Nouvelle').first()).toBeVisible();
});
