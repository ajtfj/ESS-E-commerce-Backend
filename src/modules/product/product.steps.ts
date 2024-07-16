import { classes } from '@automapper/classes';
import {
  CamelCaseNamingConvention,
  SnakeCaseNamingConvention,
} from '@automapper/core';
import { AutomapperModule, getMapperToken } from '@automapper/nestjs';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { defineFeature, loadFeature } from 'jest-cucumber';
import { ProductRepository } from 'src/modules/product/product.repository';
import { ProductService } from 'src/modules/product/product.service';

import { CategoryEntity } from '../categories/entity/category.entity';
import { ProductEntity } from './entity/product.entity';

const feature = loadFeature('features/Product.feature');

defineFeature(feature, test => {
  let productsService: ProductService;
  let productsRepositoryMock: jest.Mocked<ProductRepository>;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: ProductRepository,
          useFactory: () => ({
            exists: jest.fn(),
            create: jest.fn(),
            getById: jest.fn(),
            getAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          }),
        },
      ],
      imports: [
        AutomapperModule.forRoot({
          strategyInitializer: classes(),
          namingConventions: {
            source: new CamelCaseNamingConvention(),
            destination: new SnakeCaseNamingConvention(),
          },
        }),
      ],
    }).compile();

    productsService = module.get<ProductService>(ProductService);
    productsRepositoryMock = module.get(ProductRepository);
  });

  test(' Adicionar item', ({ given, when, then }) => {
    let result: ProductEntity;
    let productName;
    let productPrice;

    given(
      /^Não existe o produto "([^"]*)" no repositório de produtos$/,
      async name => {
        productsRepositoryMock.exists.mockResolvedValue(Promise.resolve(false));
        productName = name;
      },
    );

    when(
      /^Eu chamo o método "createProduct" do "ProductsService" com o nome "([^"]*)" e preço "([^"]*)"$/,
      async (name, price) => {
        productPrice = price;

        // Mock the add method to return a Promise that resolves to an object with an ID
        productsRepositoryMock.create.mockResolvedValue(
          Promise.resolve({
            id: 1,
            name: productName,
            price: parseFloat(productPrice),
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            stock: 0,
            category: new CategoryEntity(),
            categoryId: 0,
            description: '',
            productMedia: [],
          }),
        );

        result = await productsService.createItem({
          name: productName,
          price: parseFloat(productPrice),
          description: '',
        });
      },
    );

    then(
      /^Eu recebo o produto criado com o nome "([^"]*)" e preço "([^"]*)"$/,
      async () => {
        expect(result).toEqual(
          expect.objectContaining({
            id: 1,
            name: productName,
            price: parseFloat(productPrice),
          }),
        );
      },
    );

    then(
      /^O produto de ID "([^"]*)", nome "([^"]*)" e preço "([^"]*)" está no repositório de produtos$/,
      async (id, name, price) => {
        expect(productsRepositoryMock.create).toHaveBeenCalledWith(
          expect.objectContaining({
            name: name,
            price: parseFloat(price),
          }),
        );
      },
    );
  });

  test('Adicionar item com o mesmo nome', ({ given, when, then }) => {
    let result: Promise<ProductEntity>;
    let productId;
    let productName;
    let productPrice;

    given(
      /^O produto de ID "([^"]*)", nome "([^"]*)" e preço "([^"]*)" existe no repositório de produtos$/,
      async (id, name, price) => {
        productsRepositoryMock.exists.mockResolvedValue(Promise.resolve(true));
        productId = id;
        productName = name;
        productPrice = price;
      },
    );

    when(
      /^Eu chamo o método "createProduct" do "ProductsService" com o nome "([^"]*)" e preço "([^"]*)"$/,
      async (name, price) => {
        // Mock the add method to return a Promise that resolves to an object with an ID
        productsRepositoryMock.create.mockResolvedValue(
          Promise.resolve({
            id: productId,
            name: productName,
            price: parseFloat(productPrice),
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            stock: 0,
            category: new CategoryEntity(),
            categoryId: 0,
            description: '',
            productMedia: [],
          }),
        );

        result = productsService.createItem({
          name: productName,
          price: parseFloat(productPrice),
          description: '',
        });
      },
    );

    then(/^Eu recebo um erro$/, async () => {
      await expect(result).rejects.toThrow(ConflictException);
    });
  });

  test('Obter item pelo ID', ({ given, when, then }) => {
    let result: ProductEntity;
    let productId;
    let productName;
    let productPrice;

    given(
      /^O produto de ID "([^"]*)", nome "([^"]*)" e preço "([^"]*)" existe no repositório de produtos$/,
      async (id, name, price) => {
        productsRepositoryMock.exists.mockResolvedValue(Promise.resolve(true));
        productId = parseInt(id, 10);
        productName = name;
        productPrice = price;
      },
    );

    when(
      /^Eu chamo o metodo  "(.*)" do "(.*)" com o ID "([^"]*)"$/,
      async (id, name, price) => {
        // Mock the add method to return a Promise that resolves to an object with an ID
        productsRepositoryMock.getById.mockResolvedValue(
          Promise.resolve({
            id: productId,
            name: productName,
            price: parseFloat(productPrice),
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            stock: 0,
            category: new CategoryEntity(),
            categoryId: 0,
            description: '',
            productMedia: [],
          }),
        );

        result = await productsService.getItemById(productId);
      },
    );

    then(
      /^Eu recebo o produto de ID "([^"]*)", nome "([^"]*)" e preço "([^"]*)"$/,
      async () => {
        expect(result).toEqual(
          expect.objectContaining({
            id: productId,
            name: productName,
            price: parseFloat(productPrice),
          }),
        );
      },
    );
  });

  test('Obter todos os itens', ({ given, when, then }) => {
    let result: ProductEntity[];
    const products: ProductEntity[] = [
      {
        id: 1,
        name: 'Tênis',
        price: 99.99,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        stock: 0,
        category: new CategoryEntity(),
        categoryId: 0,
        description: '',
        productMedia: [],
      },
      {
        id: 2,
        name: 'Chinelo',
        price: 49.99,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        stock: 0,
        category: new CategoryEntity(),
        categoryId: 0,
        description: '',
        productMedia: [],
      },
    ];

    given(/^Existem produtos no repositório de produtos$/, async () => {
      productsRepositoryMock.getAll.mockResolvedValue(
        Promise.resolve(products),
      );
    });

    when(/^Eu chamo o método "getProducts" do "ProductsService"$/, async () => {
      result = await productsService.getProducts();
    });

    then(
      /^Eu recebo uma lista com todos produtos do repositório de produtos$/,
      async () => {
        expect(result).toEqual(expect.arrayContaining(products));
      },
    );
  });

  test('Atualizar item', ({ given, when, then }) => {
    given(
      /^O produto de ID "([^"]*)", nome "([^"]*)" e preço "([^"]*)" existe no repositório de produtos$/,
      async (id, name, price) => {
        productsRepositoryMock.exists.mockResolvedValue(Promise.resolve(true));
      },
    );

    when(
      /^Eu chamo o método "updateProduct" do "ProductsService" com o ID "([^"]*)", nome "([^"]*)" e preço "([^"]*)"$/,
      async (id, name, price) => {
        await productsService.updateItem(parseInt(id, 10), {
          name: name,
          price: parseFloat(price),
        });
      },
    );

    then(
      /^O produto de ID "([^"]*)" agora possui nome "([^"]*)" e preço "([^"]*)"$/,
      async (id, name, price) => {
        expect(productsRepositoryMock.update).toHaveBeenCalledWith(
          parseInt(id, 10),
          expect.objectContaining({
            name,
            price: parseFloat(price),
          }),
        );
      },
    );
  });

  test('Deletar item', ({ given, when, then }) => {
    given(
      /^O produto de ID "([^"]*)", nome "([^"]*)" e preço "([^"]*)" existe no repositório de produtos$/,
      async (id, name, price) => {
        productsRepositoryMock.exists.mockResolvedValue(Promise.resolve(true));
      },
    );

    when(
      /^Eu chamo o método "deleteProduct" do "ProductsService" com o ID "([^"]*)"$/,
      async id => {
        await productsService.deleteItem(parseInt(id, 10));
      },
    );

    then(
      /^O produto de ID "([^"]*)" não existe no repositório de produtos$/,
      async id => {
        expect(productsRepositoryMock.delete).toHaveBeenCalledWith(
          parseInt(id, 10),
        );
      },
    );
  });
});
