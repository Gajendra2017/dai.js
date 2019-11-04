import contracts from '../../contracts/contracts';
import tokens from '../../contracts/tokens';
import {
  buildTestService,
  buildTestSmartContractService
} from '../helpers/serviceBuilders';
import addresses from '../../contracts/addresses/testnet';

test('getContract should have proper error checking', async () => {
  const service = buildTestSmartContractService();

  expect(() => service.getContract('NOT_A_CONTRACT')).toThrow(
    'No contract found for "NOT_A_CONTRACT"'
  );
  expect(() => service.getContract(contracts.SAI_TOP)).toThrow(
    'Cannot resolve network ID. Are you connected?'
  );

  await service.manager().authenticate();
  expect(() =>
    service.getContract(contracts.SAI_TOP, { version: 999 })
  ).toThrow(new Error('Cannot find contract SAI_TOP, version 999'));
});

test('getContract should return a functioning contract', async () => {
  const service = buildTestSmartContractService();
  await service.manager().authenticate();
  // Read the PETH address by calling TOP.skr(). Confirm that it's the same as the configured address.
  const gem = await service.getContract(contracts.SAI_TOP).gem();

  expect(gem.toString().toUpperCase()).toEqual(
    service.getContract(tokens.WETH).address.toUpperCase()
  );
});

const mockAbi = {
  constant: true,
  inputs: [],
  name: 'foo',
  outputs: [{ name: '', type: 'bytes32' }],
  payable: false,
  stateMutability: 'view',
  type: 'function'
};

test('define contract in config', async () => {
  const mockContractDefinition = {
    address: '0xbeefed1bedded2dabbed3defaced4decade5dead',
    abi: [mockAbi]
  };

  const service = buildTestService('smartContract', {
    smartContract: {
      addContracts: {
        mock: mockContractDefinition
      }
    }
  });

  await service.manager().authenticate();
  const contract = service.getContract('mock');
  expect(contract.address).toEqual(mockContractDefinition.address);
  expect(typeof contract.foo).toBe('function');
});

test('define contracts in config with multiple addresses', async () => {
  const mockContractDefinition = {
    address: {
      testnet: '0xbeefed1bedded2dabbed3defaced4decade5dead',
      kovan: '0xbeefed1bedded2dabbed3defaced4decade5caca',
      mainnet: '0xbeefed1bedded2dabbed3defaced4decade5feed'
    },
    abi: [mockAbi]
  };

  const service = buildTestService('smartContract', {
    smartContract: {
      addContracts: {
        mock: mockContractDefinition,
        mock2: {
          address: {
            kovan: '0xbeefed1bedded2dabbed3defaced4decade5caca'
          },
          abi: [mockAbi]
        }
      }
    }
  });

  await service.manager().authenticate();
  const contract = service.getContract('mock');
  expect(contract.address).toEqual(mockContractDefinition.address.testnet);
  expect(typeof contract.foo).toBe('function');

  expect(() => {
    service.getContract('mock2');
  }).toThrowError('Contract mock2 has no address');
});

test('getContract returns contract with a valid signer', async () => {
  const service = buildTestSmartContractService();

  await service.manager().authenticate();
  const { signer } = service.getContract(contracts.SAI_TOP);
  expect(signer).toBeTruthy();
  expect(signer.provider).toBeTruthy();
});

test('call constant function without account', async () => {
  const service = buildTestSmartContractService();
  service.get('web3').get('accounts').hasAccount = jest.fn(() => false);

  await service.manager().authenticate();
  const contract = service.getContract(contracts.SAI_TOP);
  const gem = await contract.gem();
  expect(contract.signer).toBeNull();
  expect(gem.toLowerCase()).toEqual(addresses.GEM);
});
